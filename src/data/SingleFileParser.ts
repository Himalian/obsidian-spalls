/**
 * @file SingleFileParser.ts
 * @description Parsimmon-based parser for the SingleFile thino format.
 * This parser defines a formal grammar for reading memos formatted as callouts
 * under `# YYYY-MM-DD` date headings.
 * It provides a structured way to extract metadata (id, thinoType, archived, etc.)
 * and multi-line content from the Markdown document.
 */

import P from 'parsimmon';

// ---------------------------------------------------------------------------
// Low-level building blocks
// ---------------------------------------------------------------------------

/** Matches a newline character. */
const newline = P.string('\n');

/** Matches the end of the current line (not consuming the newline itself). */
const restOfLine = P.regexp(/[^\n]*/);

/**
 * Matches a "blank line" – zero or more spaces/tabs followed by a newline.
 * This is used as the separator between thino callout blocks.
 */
// const blankLine = P.regexp(/[ \t]*/).skip(newline);
//
// /** Zero or more blank lines (including truly empty lines). */
// const manyBlankLines = blankLine.many();

// ---------------------------------------------------------------------------
// Metadata parsing
// ---------------------------------------------------------------------------

/**
 * Matches a single metadata key-value pair of the form `[key::value]`.
 * e.g. [id::dcd3c4263f6b7dc3]  [thinoType::JOURNAL]  [archived::true]
 */
const metaPair: P.Parser<[string, string]> = P.seqMap(
  P.string('['),
  P.regexp(/[a-zA-Z]+/), // key
  P.string('::'),
  P.regexp(/[^\]]+/), // value (anything up to the closing bracket)
  P.string(']'),
  (_1, key, _2, value, _3) => [key, value],
);

/**
 * Matches the inline metadata block: `%% [k::v] [k::v] ... %%`
 * Returns a plain object mapping each key to its value.
 */
const metaSection: P.Parser<Record<string, string>> = P.seqMap(
  P.string('%%'),
  P.regexp(/\s*/),
  metaPair.sepBy(P.regexp(/\s+/)),
  P.regexp(/\s*/),
  P.string('%%'),
  (_1, _2, pairs, _3, _4) => Object.fromEntries(pairs),
);

// ---------------------------------------------------------------------------
// Callout header line
// ---------------------------------------------------------------------------

/**
 * Matches the timestamp portion: `YYYY/MM/DD HH:mm:ss`
 */
const timestamp = P.regexp(/\d{4}\/\d{2}\/\d{2} \d{2}:\d{2}:\d{2}/);

/**
 * Matches the full first line of a thino callout (without the trailing newline):
 *   `> [!thino] 2026/03/09 17:10:59 %% [id::...] [thinoType::...] %%`
 */
const thinoHeader: P.Parser<{ createdAt: string; meta: Record<string, string> }> = P.seqMap(
  P.string('> [!thino] '),
  timestamp,
  P.string(' '),
  metaSection,
  // Consume any leftover characters on the same line (e.g. trailing whitespace)
  restOfLine,
  (_1, ts, _2, meta, _5) => ({ createdAt: ts, meta }),
);

// ---------------------------------------------------------------------------
// Callout content lines
// ---------------------------------------------------------------------------

/**
 * Matches exactly one content line inside a callout block.
 * All content lines start with `> ` (or just `>` for an empty content line).
 * Returns the content *without* the leading `> ` prefix.
 *
 * Examples:
 *   `> Hello`  →  `Hello`
 *   `> `       →  ``  (empty line in callout)
 *   `>`         →  ``
 */
const calloutContentLine: P.Parser<string> = P.regexp(/> ?(.*)/u, 1);

/**
 * Matches one or more consecutive content lines that belong to a single callout.
 * The block of content ends as soon as we encounter a line that does NOT start
 * with `>` (i.e. a blank separator line or a `# date` heading).
 *
 * Returns the lines joined with `\n`.
 */
const calloutContent: P.Parser<string> = P.seqMap(
  calloutContentLine,
  newline.then(calloutContentLine).many(),
  (first, rest) => [first, ...rest].join('\n'),
);

// ---------------------------------------------------------------------------
// Full thino block (header + content)
// ---------------------------------------------------------------------------

interface ThinoBlock {
  createdAt: string;
  meta: Record<string, string>;
  content: string;
}

/**
 * Matches a complete thino callout block:
 *   1. The `> [!thino] … %%` header line
 *   2. An optional newline + body of consecutive `> …` content lines
 *
 * The trailing newline is consumed as part of the content separator, so we
 * handle two forms:
 *   a) header + "\n" + content lines  (normal case)
 *   b) header at EOF with no trailing newline  (edge case – empty content)
 */
const thinoBlock: P.Parser<ThinoBlock> = P.seqMap(
  thinoHeader,
  // Attempt to consume a newline and then content lines.  If the header is
  // immediately at EOF (or followed only by blank lines), produce empty content.
  newline.then(calloutContent).or(P.succeed('')),
  (header, content) => ({ ...header, content }),
);

// ---------------------------------------------------------------------------
// Date‐section grammar (Lenient)
// ---------------------------------------------------------------------------

/**
 * Matches a date heading: `# YYYY-MM-DD`
 * Returns the date string (e.g. `"2026-03-09"`).
 */
const dateHeading: P.Parser<string> = P.string('# ').then(P.regexp(/\d{4}-\d{2}-\d{2}/));

/**
 * Consumes any single line (or remainder of a line) that is NOT the start
 * of a new date section AND NOT the start of a `thinoBlock`.
 * This effectively acts as both our blank-line consumer and garbage text consumer.
 */
const garbageInsideSection = P.seq(
  P.notFollowedBy(P.eof),
  P.notFollowedBy(dateHeading),
  P.notFollowedBy(P.string('> [!thino] ')),
  P.regexp(/[^\n]*(?:\n|$)/),
).map((): null => null);

/**
 * An item inside a date section is either a valid thinoBlock or garbage/whitespace.
 */
const sectionItem = thinoBlock.or(garbageInsideSection);

/**
 * Matches a single date section:
 *   `# YYYY-MM-DD`
 *   followed by any number of thinoBlocks and/or garbage lines,
 *   until it hits the next `dateHeading` or EOF.
 */
const dateSection: P.Parser<ThinoBlock[]> = P.seqMap(
  dateHeading,
  P.regexp(/[^\n]*(?:\n|$)/), // consume the rest of the date heading line
  sectionItem.many(),
  (_date, _restOfLine, items) => items.filter((item): item is ThinoBlock => item !== null),
);

/**
 * Consumes any line BEFORE the first date heading.
 */
const garbageBetweenSections = P.seq(
  P.notFollowedBy(P.eof),
  P.notFollowedBy(dateHeading),
  P.regexp(/[^\n]*(?:\n|$)/),
).map((): null => null);

/**
 * Top-level document parser.
 * The document can have garbage before the first section, and then a sequence of date sections.
 */
const document: P.Parser<ThinoBlock[]> = P.seqMap(
  garbageBetweenSections.many(),
  dateSection.many(),
  P.eof, // ensure we've parsed the entire file
  (_garbage, sections, _eof) => sections.flat(),
);

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Converts a parsed `ThinoBlock` into a `Model.Memo`.
 *
 * The `archived` flag (when present) is encoded as a `memoType` suffix
 * (`"JOURNAL-archived"`) so consumers can distinguish archived entries without
 * changing the `Model.Memo` interface.
 */
function blockToMemo(block: ThinoBlock): Model.Memo {
  const {
    id = '',
    thinoType = 'JOURNAL',
    archived,
  } = block.meta as {
    id?: string;
    thinoType?: string;
    archived?: string;
  };

  const memoType = archived === 'true' ? `${thinoType}-archived` : thinoType;

  return {
    id,
    content: block.content.trim(),
    createdAt: block.createdAt,
    updatedAt: block.createdAt,
    deletedAt: '',
    memoType,
    path: '', // filled in by the data source after reading the file
  };
}

/**
 * Parses an entire single-file thino document and returns a flat array of
 * `Model.Memo` objects ordered as they appear in the file.
 *
 * Returns an empty array if the document contains no thino callouts.
 * Throws a descriptive error on malformed input.
 */
export function parseSingleFile(content: string): Model.Memo[] {
  if (!content.trim()) return [];

  const result = document.parse(content);

  if (!result.status) {
    // Provide a developer-friendly error message
    const pos = (result as P.Failure).index;
    throw new Error(
      `SingleFileParser: failed to parse document at line ${pos.line}, column ${pos.column}: ${(result as P.Failure).expected.join(' | ')}`,
    );
  }

  return result.value.map(blockToMemo);
}
