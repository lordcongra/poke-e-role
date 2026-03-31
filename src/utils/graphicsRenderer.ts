// src/utils/graphicsRenderer.ts
import OBR, { buildCurve, buildText, buildShape } from '@owlbear-rodeo/sdk';
import type { Item, Curve, Text as OBRText, Shape as OBRShape, AttachmentBehavior } from '@owlbear-rodeo/sdk';
import type { CharacterState } from '../store/storeTypes';
import { buildGraphicsFromState, type GraphicsData } from './graphicsDataBuilder';
import { GRAPHICS_META_ID, STATS_META_ID } from './graphicsManager';

type GraphicDef =
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

const SEVERED_BEHAVIORS: AttachmentBehavior[] = ['SCALE', 'ROTATION'];
const CURRENT_VERSION = '-v11';

const renderMutex: Record<string, Promise<void>> = {};

function getHpColor(pct: number): string {
    if (pct > 0.5) return '#4CAF50';
    if (pct > 0.2) return '#FF9800';
    return '#F44336';
}

const almostEqual = (a: number, b: number) => Math.abs(a - b) < 0.01;

export async function updateTokenGraphics(tokenId: string, state: CharacterState) {
    if (!OBR.isAvailable) return;
    try {
        const items = await OBR.scene.items.getItems([tokenId]);
        if (items.length === 0) return;
        const token = items[0];
        const meta = (token.metadata[STATS_META_ID] as Record<string, unknown>) || {};
        const role = await OBR.player.getRole();

        const data = buildGraphicsFromState(meta, state);
        await renderTokenGraphics(token, data, role, false);
    } catch (e) {
        console.error('Token Graphics Sync Error:', e);
    }
}

// AUDIT FIX: Restored forceRebuild flag!
export async function renderTokenGraphics(
    token: Item,
    data: GraphicsData,
    role: 'PLAYER' | 'GM',
    forceRebuild = false
) {
    if (!OBR.isAvailable) return;

    if (!renderMutex[token.id]) {
        renderMutex[token.id] = Promise.resolve();
    }

    renderMutex[token.id] = renderMutex[token.id].then(async () => {
        try {
            const tokenId = token.id;

            const networkAttached = (await OBR.scene.items.getItems()).filter(
                (i) => i.attachedTo === tokenId && i.metadata[GRAPHICS_META_ID] !== undefined
            );
            if (networkAttached.length > 0) {
                await OBR.scene.items.deleteItems(networkAttached.map((i) => i.id));
            }

            let localAttached = (await OBR.scene.local.getItems()).filter(
                (i) => i.attachedTo === tokenId && i.metadata[GRAPHICS_META_ID] !== undefined
            );

            if (!data.showTrackers || !data.hasSpeciesOrTrainer) {
                if (localAttached.length > 0) await OBR.scene.local.deleteItems(localAttached.map((i) => i.id));
                return;
            }

            // AUDIT FIX: Execute the force rebuild on the 1.5s delay to clear Tofu boxes!
            if (forceRebuild && localAttached.length > 0) {
                await OBR.scene.local.deleteItems(localAttached.map((i) => i.id));
                localAttached = [];
            }

            const isTokenVisible = token.visible !== false;
            const hpPct = Math.max(0, Math.min(1, data.hpCurr / Math.max(1, data.hpMax)));
            const willPct = Math.max(0, Math.min(1, data.willCurr / Math.max(1, data.willMax)));

            const s = Math.abs(token.scale.x || 1);
            const barWidth = 112 * s;

            const startX = -barWidth / 2 + data.xOffset * s;
            const baseY = (85 + data.yOffset) * s;

            const hpBaseX = startX + data.hpOffsetX * s;
            const hpBaseY = baseY - 19 * s + data.hpOffsetY * s;
            const hpCenterX = -barWidth / 2 + data.xOffset * s + data.hpOffsetX * s;

            const willBaseX = startX + data.willOffsetX * s;
            const willBaseY = baseY - 2 * s + data.willOffsetY * s;
            const willCenterX = -barWidth / 2 + data.xOffset * s + data.willOffsetX * s;

            const graphicsDef: Record<string, GraphicDef> = {};

            if (data.showHpBar) {
                const vis = (!data.gmHpBar || role === 'GM') && isTokenVisible;
                graphicsDef['hp-shadow'] = {
                    type: 'CURVE',
                    points: [
                        { x: hpBaseX + 1.5 * s, y: hpBaseY + 2 * s },
                        { x: hpBaseX + barWidth + 1.5 * s, y: hpBaseY + 2 * s }
                    ],
                    color: '#000000',
                    strokeOpacity: 0.4,
                    width: 14 * s,
                    closed: false,
                    fillOpacity: 0,
                    z: 0,
                    visible: vis
                };
                graphicsDef['hp-outline'] = {
                    type: 'CURVE',
                    points: [
                        { x: hpBaseX, y: hpBaseY },
                        { x: hpBaseX + barWidth, y: hpBaseY }
                    ],
                    color: '#FFFFFF',
                    strokeOpacity: 1,
                    width: 14 * s,
                    closed: false,
                    fillOpacity: 0,
                    z: 1,
                    visible: vis
                };
                graphicsDef['hp-bg'] = {
                    type: 'CURVE',
                    points: [
                        { x: hpBaseX, y: hpBaseY },
                        { x: hpBaseX + barWidth, y: hpBaseY }
                    ],
                    color: '#222222',
                    strokeOpacity: 1,
                    width: 12 * s,
                    closed: false,
                    fillOpacity: 0,
                    z: 2,
                    visible: vis
                };
                if (hpPct > 0) {
                    graphicsDef['hp-fill'] = {
                        type: 'CURVE',
                        points: [
                            { x: hpBaseX, y: hpBaseY },
                            { x: hpBaseX + barWidth * hpPct, y: hpBaseY }
                        ],
                        color: getHpColor(hpPct),
                        strokeOpacity: 1,
                        width: 12 * s,
                        closed: false,
                        fillOpacity: 0,
                        z: 3,
                        visible: vis
                    };
                }
            }

            if (data.showHpText) {
                const vis = (!data.gmHpText || role === 'GM') && isTokenVisible;
                graphicsDef['hp-text'] = {
                    type: 'TEXT',
                    text: `${data.hpCurr}/${data.hpMax}`,
                    x: hpCenterX,
                    y: hpBaseY - 15 * s,
                    width: barWidth,
                    height: 30 * s,
                    align: 'CENTER',
                    vAlign: 'MIDDLE',
                    size: 11 * s,
                    weight: 800,
                    stroke: 0,
                    color: '#FFFFFF',
                    fontFamily: 'Arial, sans-serif',
                    z: 5,
                    visible: vis
                };
            }

            if (data.showWillBar) {
                const vis = (!data.gmWillBar || role === 'GM') && isTokenVisible;
                graphicsDef['will-shadow'] = {
                    type: 'CURVE',
                    points: [
                        { x: willBaseX + 1.5 * s, y: willBaseY + 2 * s },
                        { x: willBaseX + barWidth + 1.5 * s, y: willBaseY + 2 * s }
                    ],
                    color: '#000000',
                    strokeOpacity: 0.4,
                    width: 14 * s,
                    closed: false,
                    fillOpacity: 0,
                    z: 0,
                    visible: vis
                };
                graphicsDef['will-outline'] = {
                    type: 'CURVE',
                    points: [
                        { x: willBaseX, y: willBaseY },
                        { x: willBaseX + barWidth, y: willBaseY }
                    ],
                    color: '#FFFFFF',
                    strokeOpacity: 1,
                    width: 14 * s,
                    closed: false,
                    fillOpacity: 0,
                    z: 1,
                    visible: vis
                };
                graphicsDef['will-bg'] = {
                    type: 'CURVE',
                    points: [
                        { x: willBaseX, y: willBaseY },
                        { x: willBaseX + barWidth, y: willBaseY }
                    ],
                    color: '#222222',
                    strokeOpacity: 1,
                    width: 12 * s,
                    closed: false,
                    fillOpacity: 0,
                    z: 2,
                    visible: vis
                };
                if (willPct > 0) {
                    graphicsDef['will-fill'] = {
                        type: 'CURVE',
                        points: [
                            { x: willBaseX, y: willBaseY },
                            { x: willBaseX + barWidth * willPct, y: willBaseY }
                        ],
                        color: '#2196F3',
                        strokeOpacity: 1,
                        width: 12 * s,
                        closed: false,
                        fillOpacity: 0,
                        z: 3,
                        visible: vis
                    };
                }
            }

            if (data.showWillText) {
                const vis = (!data.gmWillText || role === 'GM') && isTokenVisible;
                graphicsDef['will-text'] = {
                    type: 'TEXT',
                    text: `${data.willCurr}/${data.willMax}`,
                    x: willCenterX,
                    y: willBaseY - 15 * s,
                    width: barWidth,
                    height: 30 * s,
                    align: 'CENTER',
                    vAlign: 'MIDDLE',
                    size: 11 * s,
                    weight: 800,
                    stroke: 0,
                    color: '#FFFFFF',
                    fontFamily: 'Arial, sans-serif',
                    z: 5,
                    visible: vis
                };
            }

            if (data.showDef) {
                const vis = (!data.gmDef || role === 'GM') && isTokenVisible;
                const defSpdY = baseY - 37 * s + data.defOffsetY * s;
                const defSpdWidth = 24 * s;

                const defSpdX2 = startX + barWidth + data.defOffsetX * s;
                const defSpdX1 = defSpdX2 - defSpdWidth;
                const defSpdMid = defSpdX1 + defSpdWidth / 2;

                graphicsDef['def-spd-shadow'] = {
                    type: 'CURVE',
                    points: [
                        { x: defSpdX1 + 1.5 * s, y: defSpdY + 2 * s },
                        { x: defSpdX2 + 1.5 * s, y: defSpdY + 2 * s }
                    ],
                    color: '#000000',
                    strokeOpacity: 0.4,
                    width: 14 * s,
                    closed: false,
                    fillOpacity: 0,
                    z: 0,
                    visible: vis
                };
                graphicsDef['def-spd-base'] = {
                    type: 'CURVE',
                    points: [
                        { x: defSpdX1, y: defSpdY },
                        { x: defSpdX2, y: defSpdY }
                    ],
                    color: '#D9D9D9',
                    strokeOpacity: 0.6,
                    width: 14 * s,
                    closed: false,
                    fillOpacity: 0,
                    z: 2,
                    visible: vis
                };
                graphicsDef['def-spd-div'] = {
                    type: 'CURVE',
                    points: [
                        { x: defSpdMid, y: defSpdY - 5 * s },
                        { x: defSpdMid, y: defSpdY + 5 * s }
                    ],
                    color: '#FFFFFF',
                    strokeOpacity: 1,
                    width: 1.5 * s,
                    closed: false,
                    fillOpacity: 0,
                    z: 3,
                    visible: vis
                };

                const dTxtX = defSpdX1 - 8 * s;
                const sTxtX = defSpdX2 - 12 * s;
                const dTxtY = defSpdY - 9.8 * s;

                graphicsDef['def-text'] = {
                    type: 'TEXT',
                    text: String(data.defTotal),
                    x: dTxtX,
                    y: dTxtY,
                    width: 20 * s,
                    height: 20 * s,
                    align: 'CENTER',
                    vAlign: 'MIDDLE',
                    size: 12 * s,
                    weight: 700,
                    stroke: 0,
                    color: '#FFFFFF',
                    fontFamily: 'Arial, sans-serif',
                    z: 5,
                    visible: vis
                };
                graphicsDef['spd-text'] = {
                    type: 'TEXT',
                    text: String(data.sdefTotal),
                    x: sTxtX,
                    y: dTxtY,
                    width: 20 * s,
                    height: 20 * s,
                    align: 'CENTER',
                    vAlign: 'MIDDLE',
                    size: 12 * s,
                    weight: 700,
                    stroke: 0,
                    color: '#FFFFFF',
                    fontFamily: 'Arial, sans-serif',
                    z: 5,
                    visible: vis
                };
            }

            if (data.showEco) {
                const badgeCenterY = baseY + 18 * s;
                const vis = (!data.gmEco || role === 'GM') && isTokenVisible;

                const badgeWidth = 16 * s;
                const badgeHeight = 16 * s;

                const baseX_local = data.xOffset * s;
                const baseActX = baseX_local - 55 * s;
                const baseClaX = baseX_local - 8 * s;
                const baseEvaX = baseX_local - 27 * s;

                const badges = [
                    {
                        id: 'badge-act',
                        val: data.actions,
                        color: data.colorAct,
                        cx: baseActX + data.actOffsetX * s,
                        cy: badgeCenterY + data.actOffsetY * s
                    },
                    {
                        id: 'badge-eva',
                        val: data.evadeUsed ? '✓' : '◯',
                        color: data.colorEva,
                        cx: baseEvaX + data.evaOffsetX * s,
                        cy: badgeCenterY + data.evaOffsetY * s
                    },
                    {
                        id: 'badge-cla',
                        val: data.clashUsed ? '✓' : '◯',
                        color: data.colorCla,
                        cx: baseClaX + data.claOffsetX * s,
                        cy: badgeCenterY + data.claOffsetY * s
                    }
                ];

                badges.forEach((b) => {
                    const boxX = b.cx - badgeWidth / 2;
                    const boxY = b.cy - badgeHeight / 2;

                    const textXOffset = 0.3 * s;
                    let textYOffset = 0;

                    if (typeof b.val === 'number') textYOffset = -0.5 * s;
                    else if (b.val === '◯') textYOffset = 0.5 * s;
                    else if (b.val === '✓') textYOffset = 0.8 * s;

                    const finalTxtX = boxX + textXOffset;
                    const finalTxtY = boxY + textYOffset;

                    graphicsDef[`${b.id}-shadow`] = {
                        type: 'SHAPE',
                        shapeType: 'CIRCLE',
                        color: '#000000',
                        x: b.cx + 1.5 * s,
                        y: b.cy + 2 * s,
                        width: badgeWidth,
                        height: badgeHeight,
                        fillOpacity: 0.4,
                        strokeWidth: 0,
                        z: 0,
                        visible: vis
                    };
                    graphicsDef[`${b.id}-bg`] = {
                        type: 'SHAPE',
                        shapeType: 'CIRCLE',
                        color: b.color,
                        x: b.cx,
                        y: b.cy,
                        width: badgeWidth,
                        height: badgeHeight,
                        fillOpacity: 0.6,
                        strokeWidth: 0,
                        z: 2,
                        visible: vis
                    };
                    graphicsDef[`${b.id}-fg`] = {
                        type: 'TEXT',
                        text: String(b.val),
                        x: finalTxtX,
                        y: finalTxtY,
                        width: badgeWidth,
                        height: badgeHeight,
                        align: 'CENTER',
                        vAlign: 'MIDDLE',
                        size: 12 * s,
                        weight: 600,
                        stroke: 0,
                        color: '#FFFFFF',
                        fontFamily: 'Arial, sans-serif',
                        z: 4,
                        visible: vis
                    };
                });
            }

            const itemsToDelete: string[] = [];
            const validExistingItems: Item[] = [];
            const foundRoles = new Set<string>();

            for (const item of localAttached) {
                const role = item.metadata[GRAPHICS_META_ID] as string;
                const def = graphicsDef[role];
                const explicitId = `${tokenId}-${role}${CURRENT_VERSION}`;

                if (
                    !def ||
                    item.id !== explicitId ||
                    item.type !== def.type ||
                    (item.type === 'SHAPE' && (item as OBRShape).shapeType !== 'CIRCLE') ||
                    foundRoles.has(role)
                ) {
                    itemsToDelete.push(item.id);
                } else {
                    foundRoles.add(role);
                    validExistingItems.push(item);
                }
            }

            if (itemsToDelete.length > 0) {
                await OBR.scene.local.deleteItems(itemsToDelete);
            }

            const itemsToCreate: Item[] = [];

            for (const [role, def] of Object.entries(graphicsDef)) {
                const explicitId = `${tokenId}-${role}${CURRENT_VERSION}`;
                const existing = validExistingItems.find((i) => i.id === explicitId);

                if (!existing && def.visible) {
                    if (def.type === 'CURVE') {
                        const curveObj = buildCurve()
                            .id(explicitId)
                            .name('')
                            .points(def.points)
                            .strokeColor(def.color)
                            .strokeWidth(def.width)
                            .fillOpacity(def.fillOpacity ?? 0)
                            .closed(def.closed)
                            .tension(0)
                            .position(token.position)
                            .attachedTo(tokenId)
                            .disableHit(true)
                            .locked(true)
                            .layer('ATTACHMENT')
                            .zIndex(def.z)
                            .metadata({ [GRAPHICS_META_ID]: role })
                            .visible(def.visible)
                            .build();

                        if (def.fillColor) curveObj.style.fillColor = def.fillColor;
                        curveObj.style.strokeOpacity = def.strokeOpacity ?? 1;
                        curveObj.disableAttachmentBehavior = SEVERED_BEHAVIORS;
                        itemsToCreate.push(curveObj);
                    } else if (def.type === 'SHAPE') {
                        const shapeObj = buildShape()
                            .shapeType(def.shapeType)
                            .name('')
                            .width(def.width)
                            .height(def.height)
                            .fillColor(def.color)
                            .fillOpacity(def.fillOpacity)
                            .id(explicitId)
                            .position({ x: token.position.x + def.x, y: token.position.y + def.y })
                            .attachedTo(tokenId)
                            .disableHit(true)
                            .locked(true)
                            .layer('ATTACHMENT')
                            .zIndex(def.z)
                            .metadata({ [GRAPHICS_META_ID]: role })
                            .visible(def.visible)
                            .build();

                        shapeObj.style.strokeColor = def.strokeColor || 'transparent';
                        shapeObj.style.strokeWidth = def.strokeWidth || 0;
                        shapeObj.style.strokeOpacity = def.strokeOpacity ?? 1;
                        shapeObj.disableAttachmentBehavior = SEVERED_BEHAVIORS;
                        itemsToCreate.push(shapeObj);
                    } else if (def.type === 'TEXT') {
                        const txt = buildText()
                            .id(explicitId)
                            .name('')
                            .textType('PLAIN')
                            .plainText(def.text)
                            .position({ x: token.position.x + def.x, y: token.position.y + def.y })
                            .width(def.width)
                            .height(def.height)
                            .textAlign(def.align)
                            .textAlignVertical(def.vAlign)
                            .attachedTo(tokenId)
                            .disableHit(true)
                            .locked(true)
                            .layer('ATTACHMENT')
                            .zIndex(def.z)
                            .metadata({ [GRAPHICS_META_ID]: role })
                            .visible(def.visible)
                            .build();

                        txt.text.style.fontSize = def.size;
                        txt.text.style.fontWeight = def.weight;
                        txt.text.style.fillColor = def.color || '#FFFFFF';
                        txt.text.style.fillOpacity = 1;
                        txt.text.style.strokeColor = '#000000';
                        txt.text.style.strokeOpacity = def.stroke > 0 ? 1 : 0;
                        txt.text.style.strokeWidth = def.stroke;
                        if (def.fontFamily) txt.text.style.fontFamily = def.fontFamily;
                        txt.disableAttachmentBehavior = SEVERED_BEHAVIORS;
                        itemsToCreate.push(txt);
                    }
                }
            }

            if (itemsToCreate.length > 0) {
                await OBR.scene.local.addItems(itemsToCreate);
            }

            if (validExistingItems.length > 0) {
                await OBR.scene.local.updateItems(
                    validExistingItems.map((i) => i.id),
                    (updatedItems) => {
                        for (const item of updatedItems) {
                            const role = item.metadata[GRAPHICS_META_ID] as string;
                            const def = graphicsDef[role];
                            if (!def) continue;

                            if (item.name !== '') item.name = '';

                            const b = item.disableAttachmentBehavior || [];
                            if (!b.includes('SCALE') || !b.includes('ROTATION')) {
                                item.disableAttachmentBehavior = SEVERED_BEHAVIORS;
                            }

                            if (item.scale.x !== 1 || item.scale.y !== 1) {
                                item.scale = { x: 1, y: 1 };
                            }

                            if (item.visible !== def.visible) item.visible = def.visible;

                            if (def.type === 'CURVE') {
                                const curve = item as Curve;

                                if (
                                    !almostEqual(curve.position.x, token.position.x) ||
                                    !almostEqual(curve.position.y, token.position.y)
                                ) {
                                    curve.position = { x: token.position.x, y: token.position.y };
                                }

                                let pointsDiff = false;
                                if (curve.points.length !== def.points.length) {
                                    pointsDiff = true;
                                } else {
                                    for (let i = 0; i < def.points.length; i++) {
                                        if (
                                            !almostEqual(curve.points[i].x, def.points[i].x) ||
                                            !almostEqual(curve.points[i].y, def.points[i].y)
                                        ) {
                                            pointsDiff = true;
                                            break;
                                        }
                                    }
                                }
                                if (pointsDiff) curve.points = def.points;

                                if (curve.style.strokeColor !== def.color) curve.style.strokeColor = def.color;
                                if (!almostEqual(curve.style.strokeWidth, def.width))
                                    curve.style.strokeWidth = def.width;
                                const sOp = def.strokeOpacity ?? 1;
                                if (!almostEqual(curve.style.strokeOpacity, sOp)) curve.style.strokeOpacity = sOp;

                                if (def.fillColor && curve.style.fillColor !== def.fillColor)
                                    curve.style.fillColor = def.fillColor;
                                const fOp = def.fillOpacity ?? 0;
                                if (!almostEqual(curve.style.fillOpacity, fOp)) curve.style.fillOpacity = fOp;
                            } else if (def.type === 'SHAPE') {
                                const shape = item as OBRShape;

                                const targetX = token.position.x + def.x;
                                const targetY = token.position.y + def.y;

                                if (
                                    !almostEqual(shape.position.x, targetX) ||
                                    !almostEqual(shape.position.y, targetY)
                                ) {
                                    shape.position = { x: targetX, y: targetY };
                                }

                                if (!almostEqual(shape.width, def.width)) shape.width = def.width;
                                if (!almostEqual(shape.height, def.height)) shape.height = def.height;
                                if (shape.style.fillColor !== def.color) shape.style.fillColor = def.color;
                                if (!almostEqual(shape.style.fillOpacity, def.fillOpacity))
                                    shape.style.fillOpacity = def.fillOpacity;

                                const sColor = def.strokeColor || 'transparent';
                                if (shape.style.strokeColor !== sColor) shape.style.strokeColor = sColor;

                                const sWidth = def.strokeWidth || 0;
                                if (!almostEqual(shape.style.strokeWidth, sWidth)) shape.style.strokeWidth = sWidth;

                                const sOp = def.strokeOpacity ?? 1;
                                if (!almostEqual(shape.style.strokeOpacity, sOp)) shape.style.strokeOpacity = sOp;
                            } else if (def.type === 'TEXT') {
                                const txt = item as OBRText;

                                const targetX = token.position.x + def.x;
                                const targetY = token.position.y + def.y;

                                if (!almostEqual(txt.position.x, targetX) || !almostEqual(txt.position.y, targetY)) {
                                    txt.position = { x: targetX, y: targetY };
                                }

                                if (txt.text.plainText !== def.text) txt.text.plainText = def.text;
                                if (!almostEqual(txt.text.width as number, def.width)) txt.text.width = def.width;
                                if (!almostEqual(txt.text.height as number, def.height)) txt.text.height = def.height;
                                if (!almostEqual(txt.text.style.fontSize, def.size)) txt.text.style.fontSize = def.size;

                                const sOp = def.stroke > 0 ? 1 : 0;
                                if (!almostEqual(txt.text.style.strokeOpacity, sOp)) txt.text.style.strokeOpacity = sOp;

                                const sWidth = def.stroke;
                                if (!almostEqual(txt.text.style.strokeWidth, sWidth))
                                    txt.text.style.strokeWidth = sWidth;
                                if (def.color && txt.text.style.fillColor !== def.color)
                                    txt.text.style.fillColor = def.color;
                                if (def.fontFamily && txt.text.style.fontFamily !== def.fontFamily)
                                    txt.text.style.fontFamily = def.fontFamily;
                            }
                        }
                    }
                );
            }
        } catch (e) {
            console.error('Token Graphics Sync Error:', e);
        }
    });

    await renderMutex[token.id];
}
