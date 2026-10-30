export function ProgressBar({ percent, label }: { percent: number; label: string }) {
  return (
    <div className="progress">
      <div className="progress-label"><span>Avance por unidades</span><strong>{percent} %</strong></div>
      <div className="progress-track" role="progressbar" aria-label={label} aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
        <div className="progress-fill" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
