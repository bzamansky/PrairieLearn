import fs from 'node:fs/promises';
import path from 'node:path';

import type { Page } from '@playwright/test';

const VIEWPORT = { width: 1280, height: 720 };

const NOT_VISUAL = [
  'animation-*',
  'transition-*',
  'view-transition-*',
  '*timeline-*',
  'trigger-*',
  'interest-*',
  'interpolate-size',
  'scroll-behavior',
  'overscroll-*',
  'caret-*',
  'cursor',
  'pointer-events',
  'user-select',
  'touch-action',
  'interactivity',
  'app-region',
  'speak',
  'overflow-anchor',
  '-webkit-user-*',
  '-webkit-tap-*',
  'anchor-name',
  'anchor-scope',
  'container-name',
  'reading-*',
  'buffered-rendering',
  '--*',
  '*block*',
  '*inline*',
  'inset-*',
  'border-start-*',
  'border-end-*',
  'corner-start-*',
  'corner-end-*',
  'text-decoration',
  'font-variant',
  'contain-intrinsic-size',
  '-webkit-box-decoration-break',
  '-webkit-border-image',
  '-webkit-mask-position-*',
  '-webkit-line-break',
  '-webkit-ruby-position',
  '-webkit-text-combine',
  '-webkit-text-orientation',
  '-webkit-writing-mode',
];

interface SnapshotData {
  documents: { layout: { styles: number[][] } }[];
  strings: string[];
}

function matchesPattern(value: string, pattern: string): boolean {
  const expression = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replaceAll('*', '.*');
  return new RegExp(`^${expression}$`).test(value);
}

function isVisualStyle(style: string): boolean {
  return !NOT_VISUAL.some((pattern) => matchesPattern(style, pattern));
}

function storeConstantsOnce(snapshot: SnapshotData, requested: string[]) {
  const layouts = snapshot.documents.map((document) => document.layout);
  const elementRows = layouts.flatMap((layout) => layout.styles.filter((row) => row.length > 0));
  const columnCount =
    elementRows.length === 0
      ? 0
      : elementRows.reduce((minimum, row) => Math.min(minimum, row.length), Infinity);
  const columns = Array.from({ length: columnCount }, (_, index) =>
    elementRows.map((row) => row[index]),
  );
  const varies = columns.map((column) => new Set(column).size > 1);

  const same_everywhere: Record<string, string> = {};
  for (let index = 0; index < requested.length && index < columns.length; index++) {
    const column = columns[index];
    if (!varies[index] && column[0] >= 0) {
      same_everywhere[requested[index]] = snapshot.strings[column[0]];
    }
  }

  for (const layout of layouts) {
    layout.styles = layout.styles.map((row) => row.filter((_, index) => varies[index] ?? false));
  }

  return {
    styles: requested.filter((_, index) => varies[index] ?? false),
    same_everywhere,
  };
}

export async function captureSnapshot(page: Page, name: string): Promise<void> {
  const outputDirectory = process.env.OUT_DIR;
  if (!outputDirectory) {
    throw new Error('OUT_DIR must be set to capture a screenshot and DOM snapshot.');
  }

  await fs.mkdir(outputDirectory, { recursive: true });
  await page.setViewportSize(VIEWPORT);
  await page.evaluate(async () => {
    await document.fonts.ready;
    const mathJax = (window as Window & { MathJax?: { startup?: { promise?: Promise<unknown> } } })
      .MathJax;
    await mathJax?.startup?.promise;
  });
  await page.evaluate(() => {
    for (const animation of document.getAnimations()) {
      if (animation.effect?.getComputedTiming().endTime === Infinity) {
        animation.cancel();
      } else {
        animation.finish();
      }
    }
  });

  const outputPrefix = path.join(outputDirectory, name);
  await page.screenshot({ path: `${outputPrefix}.png`, fullPage: true });

  const requested = await page.evaluate(() =>
    Array.from(getComputedStyle(document.documentElement)),
  );
  const visualStyles = requested.filter(isVisualStyle);
  const cdp = await page.context().newCDPSession(page);
  let snapshot: SnapshotData;
  try {
    snapshot = await cdp.send('DOMSnapshot.captureSnapshot', {
      computedStyles: visualStyles,
      includePaintOrder: true,
    });
  } finally {
    await cdp.detach();
  }

  const styleFields = storeConstantsOnce(snapshot, visualStyles);
  const file = {
    device_pixel_ratio: await page.evaluate(() => window.devicePixelRatio),
    ...styleFields,
    snapshot,
  };
  await fs.writeFile(`${outputPrefix}_snapshot.json`, JSON.stringify(file));
}
