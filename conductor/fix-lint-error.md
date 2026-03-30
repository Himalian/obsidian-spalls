# Fix Lint Error: Upgrade `eslint-plugin-prettier` to v5

## Objective

Fix the `TypeError: prettier.resolveConfig.sync is not a function` error occurring during linting due to incompatibility between `eslint-plugin-prettier` v4 and Prettier 3.

## Key Files & Context

- `package.json`: Contains the dependency versions.
- `.eslintrc.js`: ESLint configuration that uses the `prettier/prettier` rule.

## Implementation Steps

1. **Update Dependencies:**
   - Modify `package.json` to change `"eslint-plugin-prettier": "^4.0.0"` to `"eslint-plugin-prettier": "^5.0.0"`.
2. **Install Dependencies:**
   - Execute `bun install` to apply the changes and update `bun.lock`.
3. **Verification:**
   - Run `bun run lint` to confirm that the linting process completes without the Prettier-related TypeError.

## Verification & Testing

- Run `bun run lint` and ensure it passes (or at least doesn't throw the same `TypeError`).
