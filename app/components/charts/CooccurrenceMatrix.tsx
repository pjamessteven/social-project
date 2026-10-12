"use client";

import { formatRatio, SMALL_SAMPLE_N } from "@/app/lib/stats-math";
import { useTranslations } from "next-intl";
import { Fragment } from "react";
import { useChartColors } from "./chart-theme";

export interface MatrixAxisItem {
  key: string;
  label: string;
}

export interface MatrixCellData {
  row: string;
  col: string;
  rate: number;
  rateWithout: number | null;
  n: number;
  nWithout: number;
  ratio: number | null;
  ratioLow: number | null;
  ratioHigh: number | null;
}

/** Ratio at which the colour reaches full strength (and its inverse). */
const FULL_STRENGTH = 4;

/**
 * Risk-ratio heatmap rendered as a CSS grid: rows are features, columns are
 * outcomes. Each cell reads "the outcome is N× as common in stories with the
 * row feature as in stories without it". Blue = more common, red = less.
 * Cells whose 95% interval includes 1× stay grey; cells with fewer than
 * SMALL_SAMPLE_N stories are left blank.
 */
export default function CooccurrenceMatrix({
  rows,
  cols,
  cells,
}: {
  rows: MatrixAxisItem[];
  cols: MatrixAxisItem[];
  cells: MatrixCellData[];
}) {
  const t = useTranslations("statsPage.matrix");
  const colors = useChartColors();
  const cellMap = new Map(
    cells.map((cell) => [`${cell.row}|${cell.col}`, cell]),
  );

  const background = (cell: MatrixCellData) => {
    if (cell.ratio == null || cell.ratioLow == null || cell.ratioHigh == null) {
      return "transparent";
    }
    if (cell.ratioLow <= 1 && cell.ratioHigh >= 1) return colors.midpoint;
    const strength = Math.min(
      1,
      Math.abs(Math.log(cell.ratio)) / Math.log(FULL_STRENGTH),
    );
    const alpha = Math.round((0.25 + strength * 0.75) * 255)
      .toString(16)
      .padStart(2, "0");
    return `${cell.ratio > 1 ? colors.positive : colors.negative}${alpha}`;
  };

  return (
    <div className="overflow-x-auto">
      <div
        className="grid min-w-[36rem] gap-0.5"
        role="grid"
        style={{
          gridTemplateColumns: `minmax(8.5rem, 12rem) repeat(${cols.length}, minmax(3.75rem, 1fr))`,
        }}
      >
        <div />
        {cols.map((col) => (
          <div
            key={col.key}
            role="columnheader"
            className="text-muted-foreground flex items-end justify-center px-1 pb-2 text-center text-sm leading-tight font-medium break-words hyphens-auto"
          >
            {col.label}
          </div>
        ))}
        {rows.map((row) => (
          <Fragment key={row.key}>
            <div
              role="rowheader"
              className="flex items-center pr-3 text-base leading-tight"
            >
              {row.label}
            </div>
            {cols.map((col) => {
              const cell = cellMap.get(`${row.key}|${col.key}`);
              const masked =
                !cell ||
                cell.ratio == null ||
                cell.n < SMALL_SAMPLE_N ||
                cell.nWithout < SMALL_SAMPLE_N;
              const title = masked
                ? t("cellMasked", { row: row.label, col: col.label })
                : t("cellTooltipRatio", {
                    row: row.label,
                    col: col.label,
                    percent: Math.round(cell.rate * 100),
                    n: cell.n,
                    percentWithout: Math.round((cell.rateWithout ?? 0) * 100),
                    ratio: formatRatio(cell.ratio!),
                    low: formatRatio(cell.ratioLow!),
                    high: formatRatio(cell.ratioHigh!),
                  });
              return (
                <div
                  key={col.key}
                  role="gridcell"
                  title={title}
                  className={`flex h-11 items-center justify-center rounded-sm text-sm tabular-nums ${
                    masked ? "text-muted-foreground" : "text-foreground"
                  }`}
                  style={{
                    background: masked ? "transparent" : background(cell!),
                  }}
                >
                  {masked ? "–" : formatRatio(cell!.ratio!)}
                </div>
              );
            })}
          </Fragment>
        ))}
      </div>
    </div>
  );
}
