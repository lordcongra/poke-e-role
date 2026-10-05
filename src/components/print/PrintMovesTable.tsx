import type { MoveData, PrintConfig } from '../../store/storeTypes';

interface PrintMovesTableProps {
    moves: MoveData[];
    config: PrintConfig;
}

export function PrintMovesTable({ moves, config }: PrintMovesTableProps) {
    if (config.hideMoves) return null;

    if (config.autoHideEmptySections && moves.length === 0 && !config.blankMoves) {
        return null;
    }

    return (
        <div className="print-sheet__section">
            <h4 className="print-sheet__section-title">Moves</h4>
            <table className="print-sheet__move-table">
                <thead>
                    <tr>
                        <th className="print-sheet__col-name">Name</th>
                        <th className="print-sheet__col-type">Type</th>
                        <th className="print-sheet__col-cat">Cat.</th>
                        <th className="print-sheet__col-power">Power</th>
                        <th className="print-sheet__col-acc">Accuracy</th>
                        <th className="print-sheet__col-dmg">Damage</th>
                        {!config.hideMoveDesc && <th>Description / Effects</th>}
                    </tr>
                </thead>
                <tbody>
                    {config.blankMoves
                        ? Array.from({ length: 6 }).map((_, i) => (
                              <tr key={i}>
                                  <td className="print-sheet__empty-cell"></td>
                                  <td></td>
                                  <td></td>
                                  <td></td>
                                  <td></td>
                                  <td></td>
                                  {!config.hideMoveDesc && <td></td>}
                              </tr>
                          ))
                        : moves.map((move, i) => {
                              const dualAccMatch = move.desc?.match(/Accuracy:\s*([^\n[]+)/i);
                              const dualDmgMatch = move.desc?.match(/Damage:\s*([^\n[]+)/i);

                              const accString = dualAccMatch
                                  ? dualAccMatch[1].trim()
                                  : (move.acc2 || '').toLowerCase() === 'none'
                                    ? (move.acc1 || '').toUpperCase()
                                    : `${(move.acc1 || '').toUpperCase()} + ${(move.acc2 || '').charAt(0).toUpperCase() + (move.acc2 || '').slice(1)}`;
                              const dmgString = dualDmgMatch ? dualDmgMatch[1].trim() : (move.dmg1 || '').toUpperCase();

                              let cleanDesc = move.desc || '';
                              const retainedTags = cleanDesc.match(/\[.*?\]/g)?.join(' ') || '';
                              cleanDesc = cleanDesc.replace(/\[.*?\]/g, '').trim();
                              cleanDesc = cleanDesc.replace(/\n\nAccuracy:[\s\S]*/i, '').trim();
                              if (retainedTags) cleanDesc = `${cleanDesc} ${retainedTags}`.trim();

                              return (
                                  <tr key={i}>
                                      <td>
                                          <strong>
                                              {move.marker ? `${move.marker} ` : ''}
                                              {move.name}
                                          </strong>
                                      </td>
                                      <td>{move.type}</td>
                                      <td>{move.category}</td>
                                      <td>{move.power}</td>
                                      <td>{accString}</td>
                                      <td>{move.category === 'Status' ? '-' : dmgString}</td>
                                      {!config.hideMoveDesc && <td>{cleanDesc}</td>}
                                  </tr>
                              );
                          })}
                </tbody>
            </table>
        </div>
    );
}
