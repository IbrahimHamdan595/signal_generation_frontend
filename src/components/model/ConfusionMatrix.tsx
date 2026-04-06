"use client";

const LABELS = ["Hold", "Buy", "Sell"];

interface ConfusionMatrixProps {
  matrix: number[][];
}

export default function ConfusionMatrix({ matrix }: ConfusionMatrixProps) {
  const maxVal = Math.max(...matrix.flat());

  return (
    <div>
      <p className="text-xs text-muted mb-3">Confusion Matrix</p>
      <div className="overflow-x-auto">
        <table className="text-xs">
          <thead>
            <tr>
              <th className="w-12 pb-1" />
              {LABELS.map((l) => (
                <th key={l} className="pb-1 px-1 text-muted font-medium text-center w-16">
                  {l}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {matrix.map((row, i) => (
              <tr key={i}>
                <td className="pr-2 text-muted font-medium py-0.5">{LABELS[i]}</td>
                {row.map((val, j) => {
                  const intensity = maxVal > 0 ? val / maxVal : 0;
                  const isCorrect = i === j;
                  return (
                    <td key={j} className="py-0.5 px-1">
                      <div
                        className="w-16 h-10 rounded flex items-center justify-center font-bold text-sm"
                        style={{
                          backgroundColor: isCorrect
                            ? `rgba(0, 217, 126, ${0.1 + intensity * 0.5})`
                            : `rgba(255, 69, 96, ${intensity * 0.35})`,
                          color: isCorrect ? "var(--buy)" : intensity > 0.3 ? "var(--sell)" : "var(--muted)",
                        }}
                      >
                        {val}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex gap-4 mt-3 text-xs text-muted">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-sm bg-buy/40 inline-block" /> Correct
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-sm bg-sell/30 inline-block" /> Misclassified
          </span>
        </div>
      </div>
    </div>
  );
}
