import { Info } from 'lucide-react';

interface TagBuilderPreviewProps {
    builtTag: string;
    explanation: string;
}

export function TagBuilderPreview({ builtTag, explanation }: TagBuilderPreviewProps) {
    return (
        <div className="tag-builder__preview-box">
            <div className="tag-builder__preview-top">
                <span className="tag-builder__preview-label">Live Tag Preview:</span>
                <div className="tag-builder__preview-tag">
                    {builtTag || <span className="tag-builder__preview-placeholder">No Tag Generated</span>}
                </div>
            </div>
            <div className="tag-builder__preview-explanation">
                <Info size={14} className="tag-builder__preview-info-icon" />
                <span>{explanation}</span>
            </div>
        </div>
    );
}
