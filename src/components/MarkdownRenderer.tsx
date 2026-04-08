import { Component, MarkdownRenderer as ObsidianMarkdownRenderer } from 'obsidian';
import 'react';
import { useContext, useEffect, useRef } from 'react';
import appContext from '../stores/appContext';

interface Props {
  content: string;
  className?: string;
  sourcePath?: string;
}

function MarkdownRenderer({ content, className, sourcePath }: Props) {
  const {
    dailyNotesState: { app },
  } = useContext(appContext);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || !app) return;

    containerRef.current.empty();

    const component = new Component();
    component.load();

    ObsidianMarkdownRenderer.render(app, content, containerRef.current, sourcePath || '', component).then(() => {
      const buttons = containerRef.current.querySelectorAll('.copy-code-button');
      buttons.forEach((btn) => {
        btn.classList.add('btn', 'action-btn', 'clickable-icon');
      });
    });

    return () => {
      component.unload();
    };
  }, [content, app, sourcePath]);

  return <div ref={containerRef} className={`spalls-markdown-preview-view markdown-rendered ${className || ''}`} />;
}

export default MarkdownRenderer;
