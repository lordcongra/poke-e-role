import type { AttachmentBehavior } from '@owlbear-rodeo/sdk';

export const SEVERED_BEHAVIORS: AttachmentBehavior[] = ['SCALE', 'ROTATION'];
export const CURRENT_VERSION = '-v11';

export type GraphicDefinition =
    | {
          type: 'CURVE';
          points: { x: number; y: number }[];
          color: string;
          width: number;
          closed: boolean;
          fillColor?: string;
          fillOpacity?: number;
          strokeOpacity?: number;
          z: number;
          visible: boolean;
      }
    | {
          type: 'TEXT';
          text: string;
          x: number;
          y: number;
          width: number;
          height: number;
          align: 'LEFT' | 'CENTER' | 'RIGHT';
          vAlign: 'TOP' | 'MIDDLE' | 'BOTTOM';
          size: number;
          weight: number;
          stroke: number;
          z: number;
          visible: boolean;
          color?: string;
          fontFamily?: string;
      }
    | {
          type: 'SHAPE';
          shapeType: 'CIRCLE';
          color: string;
          x: number;
          y: number;
          width: number;
          height: number;
          fillOpacity: number;
          strokeColor?: string;
          strokeWidth?: number;
          strokeOpacity?: number;
          z: number;
          visible: boolean;
      };
