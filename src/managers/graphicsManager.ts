import OBR, { buildCurve, buildText, buildShape } from "@owlbear-rodeo/sdk";
import type { Item, Curve, Text as OBRText, Shape as OBRShape, AttachmentBehavior } from "@owlbear-rodeo/sdk";

export const GRAPHICS_META_ID = "pokerole-extension/graphic-role";
export const STATS_META_ID = "pokerole-extension/stats"; 

// --- CUSTOMIZABLE BADGE DEFAULTS ---
export const DEFAULT_COLOR_ACT = '#4890fc'; 
export const DEFAULT_COLOR_EVA = '#c387fc'; 
export const DEFAULT_COLOR_CLA = '#dfad43'; 

export interface GraphicsData {
    hpCurr: number; hpMax: number;
    willCurr: number; willMax: number;
    def: number; spd: number;
    actions: number; evadeUsed: boolean; clashUsed: boolean;
    showTrackers: boolean; 
    showHpBar: boolean; gmHpBar: boolean;
    showHpText: boolean; gmHpText: boolean;
    showWillBar: boolean; gmWillBar: boolean;
    showWillText: boolean; gmWillText: boolean;
    showDef: boolean; gmDef: boolean;
    showEco: boolean; gmEco: boolean;
    colorAct: string; colorEva: string; colorCla: string;
    yOffset: number; 
}

// STRICT TYPING
type GraphicDef = 
    | { type: 'CURVE'; points: {x: number, y: number}[]; color: string; width: number; closed: boolean; fillColor?: string; fillOpacity?: number; strokeOpacity?: number; z: number; visible: boolean; }
    | { type: 'TEXT'; text: string; x: number; y: number; width: number; height: number; align: "LEFT" | "CENTER" | "RIGHT"; vAlign: "TOP" | "MIDDLE" | "BOTTOM"; size: number; weight: number; stroke: number; z: number; visible: boolean; color?: string; fontFamily?: string; }
    | { type: 'SHAPE'; shapeType: "CIRCLE"; color: string; x: number; y: number; width: number; height: number; fillOpacity: number; strokeColor?: string; strokeWidth?: number; strokeOpacity?: number; z: number; visible: boolean; };

const SEVERED_BEHAVIORS: AttachmentBehavior[] = ["SCALE", "ROTATION"];

function getHpColor(pct: number): string {
    if (pct > 0.5) return '#4CAF50';
    if (pct > 0.2) return '#FF9800';
    return '#F44336';
}

const almostEqual = (a: number, b: number) => Math.abs(a - b) < 0.01;

export function buildGraphicsDataFromMetadata(meta: Record<string, any>): GraphicsData {
    return {
        hpCurr: Number(meta['hp-curr']) || 0,
        hpMax: Number(meta['hp-max-display']) || 1,
        willCurr: Number(meta['will-curr']) || 0,
        willMax: Number(meta['will-max-display']) || 1,
        def: Number(meta['def-total']) || 0,
        spd: Number(meta['spd-total']) || 0,
        actions: Number(meta['actions-used']) || 0,
        evadeUsed: meta['evasions-used'] === true || meta['evasions-used'] === 'true',
        clashUsed: meta['clashes-used'] === true || meta['clashes-used'] === 'true',
        
        showTrackers: meta['show-trackers'] !== false && meta['show-trackers'] !== 'false',
        showHpBar: meta['setting-hp-bar'] !== false && meta['setting-hp-bar'] !== 'false',
        gmHpBar: meta['gm-hp-bar'] === true || meta['gm-hp-bar'] === 'true',
        showHpText: meta['setting-hp-text'] !== false && meta['setting-hp-text'] !== 'false',
        gmHpText: meta['gm-hp-text'] === true || meta['gm-hp-text'] === 'true',
        showWillBar: meta['setting-will-bar'] !== false && meta['setting-will-bar'] !== 'false',
        gmWillBar: meta['gm-will-bar'] === true || meta['gm-will-bar'] === 'true',
        showWillText: meta['setting-will-text'] !== false && meta['setting-will-text'] !== 'false',
        gmWillText: meta['gm-will-text'] === true || meta['gm-will-text'] === 'true',
        showDef: meta['setting-def-badge'] !== false && meta['setting-def-badge'] !== 'false',
        gmDef: meta['gm-def-badge'] === true || meta['gm-def-badge'] === 'true',
        showEco: meta['setting-eco-badge'] !== false && meta['setting-eco-badge'] !== 'false',
        gmEco: meta['gm-eco-badge'] === true || meta['gm-eco-badge'] === 'true',

        colorAct: meta['color-act'] || DEFAULT_COLOR_ACT,
        colorEva: meta['color-eva'] || DEFAULT_COLOR_EVA,
        colorCla: meta['color-cla'] || DEFAULT_COLOR_CLA,
        yOffset: Number(meta['y-offset']) || 0,
    };
}

export async function updateTokenGraphics(tokenInput: string | Item, data: GraphicsData) {
    let token: Item;
    if (typeof tokenInput === 'string') {
        const items = await OBR.scene.items.getItems([tokenInput]);
        if (items.length === 0) return;
        token = items[0];
    } else {
        token = tokenInput;
    }
    const tokenId = token.id;

    const meta = (token.metadata[STATS_META_ID] as Record<string, any>) || {};
    const species = String(meta['species'] || '');
    const hasSpecies = species.trim() !== '';

    const localAttached = (await OBR.scene.local.getItems()).filter(i => i.attachedTo === tokenId && i.metadata[GRAPHICS_META_ID] !== undefined);
    const networkAttached = (await OBR.scene.items.getItems()).filter(i => i.attachedTo === tokenId && i.metadata[GRAPHICS_META_ID] !== undefined);
    
    if (networkAttached.length > 0) {
        await OBR.scene.items.deleteItems(networkAttached.map(i => i.id));
    }

    if (!data.showTrackers || !hasSpecies) {
        if (localAttached.length > 0) {
            await OBR.scene.local.deleteItems(localAttached.map(i => i.id));
        }
        return;
    }

    const isTokenVisible = token.visible !== false;

    const hpPct = Math.max(0, Math.min(1, data.hpCurr / Math.max(1, data.hpMax)));
    const willPct = Math.max(0, Math.min(1, data.willCurr / Math.max(1, data.willMax)));

    const s = Math.abs(token.scale.x || 1); 

    const barWidth = 112 * s; 
    const startX = -barWidth / 2; 
    
    const baseY = (85 + (data.yOffset || 0)) * s;
    const hpY = baseY - (19 * s); 
    const willY = baseY - (2 * s); 

    const graphicsDef: Record<string, GraphicDef> = {};

    if (data.showHpBar) {
        const vis = !data.gmHpBar && isTokenVisible;
        graphicsDef['hp-shadow'] = { type: 'CURVE', points: [{x: startX+(1.5*s), y: hpY+(2*s)}, {x: startX + barWidth+(1.5*s), y: hpY+(2*s)}], color: '#000000', strokeOpacity: 0.4, width: 14*s, closed: false, fillOpacity: 0, z: 0, visible: vis };
        graphicsDef['hp-outline'] = { type: 'CURVE', points: [{x: startX, y: hpY}, {x: startX + barWidth, y: hpY}], color: '#FFFFFF', width: 14*s, closed: false, fillOpacity: 0, z: 1, visible: vis };
        graphicsDef['hp-bg'] = { type: 'CURVE', points: [{x: startX, y: hpY}, {x: startX + barWidth, y: hpY}], color: '#222222', width: 12*s, closed: false, fillOpacity: 0, z: 2, visible: vis };
        if (hpPct > 0) {
            graphicsDef['hp-fill'] = { type: 'CURVE', points: [{x: startX, y: hpY}, {x: startX + (barWidth * hpPct), y: hpY}], color: getHpColor(hpPct), width: 12*s, closed: false, fillOpacity: 0, z: 3, visible: vis };
        }
    }
    
    if (data.showHpText) {
        graphicsDef['hp-text'] = { type: 'TEXT', text: `${data.hpCurr}/${data.hpMax}`, x: -barWidth/2, y: hpY - (15*s), width: barWidth, height: 30*s, align: "CENTER", vAlign: "MIDDLE", size: 11*s, weight: 800, stroke: 0, color: '#FFFFFF', fontFamily: "Arial, sans-serif", z: 5, visible: !data.gmHpText && isTokenVisible };
    }

    if (data.showWillBar) {
        const vis = !data.gmWillBar && isTokenVisible;
        graphicsDef['will-shadow'] = { type: 'CURVE', points: [{x: startX+(1.5*s), y: willY+(2*s)}, {x: startX + barWidth+(1.5*s), y: willY+(2*s)}], color: '#000000', strokeOpacity: 0.4, width: 14*s, closed: false, fillOpacity: 0, z: 0, visible: vis };
        graphicsDef['will-outline'] = { type: 'CURVE', points: [{x: startX, y: willY}, {x: startX + barWidth, y: willY}], color: '#FFFFFF', width: 14*s, closed: false, fillOpacity: 0, z: 1, visible: vis };
        graphicsDef['will-bg'] = { type: 'CURVE', points: [{x: startX, y: willY}, {x: startX + barWidth, y: willY}], color: '#222222', width: 12*s, closed: false, fillOpacity: 0, z: 2, visible: vis };
        if (willPct > 0) {
            graphicsDef['will-fill'] = { type: 'CURVE', points: [{x: startX, y: willY}, {x: startX + (barWidth * willPct), y: willY}], color: '#2196F3', width: 12*s, closed: false, fillOpacity: 0, z: 3, visible: vis };
        }
    }

    if (data.showWillText) {
        graphicsDef['will-text'] = { type: 'TEXT', text: `${data.willCurr}/${data.willMax}`, x: -barWidth/2, y: willY - (15*s), width: barWidth, height: 30*s, align: "CENTER", vAlign: "MIDDLE", size: 11*s, weight: 800, stroke: 0, color: '#FFFFFF', fontFamily: "Arial, sans-serif", z: 5, visible: !data.gmWillText && isTokenVisible };
    }

    if (data.showDef) {
        const vis = !data.gmDef && isTokenVisible;
        const defSpdY = hpY - (18*s); 
        const defSpdWidth = 24*s; 
        
        const defSpdX2 = startX + barWidth; 
        const defSpdX1 = defSpdX2 - defSpdWidth;
        const defSpdMid = defSpdX1 + (defSpdWidth / 2);

        graphicsDef['def-spd-shadow'] = { type: 'CURVE', points: [{x: defSpdX1+(1.5*s), y: defSpdY+(2*s)}, {x: defSpdX2+(1.5*s), y: defSpdY+(2*s)}], color: '#000000', strokeOpacity: 0.4, width: 14*s, closed: false, fillOpacity: 0, z: 0, visible: vis };
        graphicsDef['def-spd-base'] = { type: 'CURVE', points: [{x: defSpdX1, y: defSpdY}, {x: defSpdX2, y: defSpdY}], color: '#D9D9D9', strokeOpacity: 0.6, width: 14*s, closed: false, fillOpacity: 0, z: 2, visible: vis };
        graphicsDef['def-spd-div'] = { type: 'CURVE', points: [{x: defSpdMid, y: defSpdY - (5*s)}, {x: defSpdMid, y: defSpdY + (5*s)}], color: '#FFFFFF', width: 1.5*s, closed: false, fillOpacity: 0, z: 3, visible: vis }; 

        const dTxtX = defSpdX1 - (8*s); 
        const sTxtX = defSpdX2 - (12*s); 
        const dTxtY = defSpdY - (9.8*s); 

        graphicsDef['def-text'] = { type: 'TEXT', text: String(data.def), x: dTxtX, y: dTxtY, width: 20*s, height: 20*s, align: "CENTER", vAlign: "MIDDLE", size: 12*s, weight: 700, stroke: 0, color: '#FFFFFF', fontFamily: "Arial, sans-serif", z: 5, visible: vis };
        graphicsDef['spd-text'] = { type: 'TEXT', text: String(data.spd), x: sTxtX, y: dTxtY, width: 20*s, height: 20*s, align: "CENTER", vAlign: "MIDDLE", size: 12*s, weight: 700, stroke: 0, color: '#FFFFFF', fontFamily: "Arial, sans-serif", z: 5, visible: vis };
    }

    if (data.showEco) {
        const badgeCenterY = willY + (18 * s); 
        const vis = !data.gmEco && isTokenVisible;

        const badgeWidth = 16 * s; 
        const badgeHeight = 16 * s; 
        const standardSpacing = badgeWidth + (3 * s); 
        
        const visualLeftEdge = startX - (7 * s); 
        const cx_act = visualLeftEdge + (badgeWidth / 2);
        const cx_cla = 0 - (badgeWidth / 2);
        const cx_eva = cx_cla - standardSpacing;

        const badges = [
            { id: 'badge-act', val: data.actions, color: data.colorAct, cx: cx_act },
            { id: 'badge-eva', val: data.evadeUsed ? '✓' : '◯', color: data.colorEva, cx: cx_eva },
            { id: 'badge-cla', val: data.clashUsed ? '✓' : '◯', color: data.colorCla, cx: cx_cla }
        ];

        badges.forEach((b) => {
            const cy = badgeCenterY;
            const boxX = b.cx - (badgeWidth / 2); 
            const boxY = cy - (badgeHeight / 2);

            const textXOffset = 0.3 * s; 
            let textYOffset = 0;

            if (typeof b.val === 'number') textYOffset = -0.5 * s; 
            else if (b.val === '◯') textYOffset = 0.5 * s; 
            else if (b.val === '✓') textYOffset = 0.8 * s; 

            const finalTxtX = boxX + textXOffset;
            const finalTxtY = boxY + textYOffset;

            graphicsDef[`${b.id}-shadow`] = { type: 'SHAPE', shapeType: 'CIRCLE', color: '#000000', x: b.cx + (1.5*s), y: cy + (2*s), width: badgeWidth, height: badgeHeight, fillOpacity: 0.4, strokeWidth: 0, z: 0, visible: vis };
            graphicsDef[`${b.id}-bg`] = { type: 'SHAPE', shapeType: 'CIRCLE', color: b.color, x: b.cx, y: cy, width: badgeWidth, height: badgeHeight, fillOpacity: 0.6, strokeWidth: 0, z: 2, visible: vis };
            graphicsDef[`${b.id}-fg`] = { type: 'TEXT', text: String(b.val), x: finalTxtX, y: finalTxtY, width: badgeWidth, height: badgeHeight, align: "CENTER", vAlign: "MIDDLE", size: 12*s, weight: 600, stroke: 0, color: '#FFFFFF', fontFamily: "Arial, sans-serif", z: 4, visible: vis };
        });
    }

    const itemsToDelete: string[] = [];
    const validExistingItems: Item[] = [];

    for (const item of localAttached) {
        const role = item.metadata[GRAPHICS_META_ID] as string;
        const def = graphicsDef[role];
        
        if (!def || item.type !== def.type || (item.type === 'SHAPE' && (item as OBRShape).shapeType !== 'CIRCLE')) {
            itemsToDelete.push(item.id);
        } else {
            validExistingItems.push(item);
        }
    }

    if (itemsToDelete.length > 0) {
        await OBR.scene.local.deleteItems(itemsToDelete);
    }

    const itemsToCreate: Item[] = [];

    for (const [role, def] of Object.entries(graphicsDef)) {
        const explicitId = `${tokenId}-${role}`;
        const existing = validExistingItems.find(i => i.id === explicitId);
        
        if (!existing && def.visible) {
            if (def.type === 'CURVE') {
                const curveObj = buildCurve()
                    .id(explicitId).name("").points(def.points).strokeColor(def.color).strokeWidth(def.width).fillOpacity(def.fillOpacity ?? 0).closed(def.closed).tension(0)
                    .position(token.position).attachedTo(tokenId).disableHit(true).locked(true).layer("ATTACHMENT").zIndex(def.z)
                    .metadata({ [GRAPHICS_META_ID]: role }).visible(def.visible).build();
                
                if (def.fillColor) curveObj.style.fillColor = def.fillColor;
                curveObj.style.strokeOpacity = def.strokeOpacity ?? 1;
                curveObj.disableAttachmentBehavior = SEVERED_BEHAVIORS;
                
                itemsToCreate.push(curveObj);
            } else if (def.type === 'SHAPE') {
                const shapeObj = buildShape()
                    .shapeType(def.shapeType).name("")
                    .width(def.width).height(def.height)
                    .fillColor(def.color).fillOpacity(def.fillOpacity)
                    .id(explicitId).position({ x: token.position.x + def.x, y: token.position.y + def.y })
                    .attachedTo(tokenId).disableHit(true).locked(true).layer("ATTACHMENT").zIndex(def.z)
                    .metadata({ [GRAPHICS_META_ID]: role, offsetX: def.x, offsetY: def.y }).visible(def.visible).build(); 
                
                shapeObj.style.strokeColor = def.strokeColor || 'transparent';
                shapeObj.style.strokeWidth = def.strokeWidth || 0;
                shapeObj.style.strokeOpacity = def.strokeOpacity ?? 1;
                shapeObj.disableAttachmentBehavior = SEVERED_BEHAVIORS;
                
                itemsToCreate.push(shapeObj);
            } else if (def.type === 'TEXT') {
                const txt = buildText().id(explicitId).name("").textType("PLAIN").plainText(def.text).position({ x: token.position.x + def.x, y: token.position.y + def.y }).width(def.width).height(def.height).textAlign(def.align).textAlignVertical(def.vAlign).attachedTo(tokenId).disableHit(true).locked(true).layer("ATTACHMENT").zIndex(def.z)
                    .metadata({ [GRAPHICS_META_ID]: role, offsetX: def.x, offsetY: def.y }).visible(def.visible).build(); 
                
                txt.text.style.fontSize = def.size; txt.text.style.fontWeight = def.weight; txt.text.style.fillColor = def.color || "#FFFFFF"; txt.text.style.fillOpacity = 1; 
                txt.text.style.strokeColor = "#000000"; 
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
        await OBR.scene.local.updateItems(validExistingItems.map(i => i.id), (updatedItems) => {
            for (const item of updatedItems) {
                const role = item.metadata[GRAPHICS_META_ID] as string;
                const def = graphicsDef[role];
                if (!def) continue;

                if (item.name !== "") item.name = "";

                const b = item.disableAttachmentBehavior || [];
                if (!b.includes("SCALE") || !b.includes("ROTATION")) {
                    item.disableAttachmentBehavior = SEVERED_BEHAVIORS;
                }

                if (item.scale.x !== 1 || item.scale.y !== 1) {
                    item.scale = { x: 1, y: 1 };
                }

                if (item.visible !== def.visible) item.visible = def.visible;

                if (def.type === 'CURVE') {
                    const curve = item as Curve;
                    
                    if (!almostEqual(curve.position.x, token.position.x) || !almostEqual(curve.position.y, token.position.y)) {
                        curve.position = { x: token.position.x, y: token.position.y };
                    }

                    let pointsDiff = false;
                    if (curve.points.length !== def.points.length) {
                        pointsDiff = true;
                    } else {
                        for (let p = 0; p < curve.points.length; p++) {
                            if (!almostEqual(curve.points[p].x, def.points[p].x) || !almostEqual(curve.points[p].y, def.points[p].y)) {
                                pointsDiff = true; break;
                            }
                        }
                    }
                    if (pointsDiff) curve.points = def.points;
                    
                    if (curve.style.strokeColor !== def.color) curve.style.strokeColor = def.color;
                    if (!almostEqual(curve.style.strokeWidth, def.width)) curve.style.strokeWidth = def.width;
                    
                    const fOp = def.fillOpacity ?? 0;
                    if (!almostEqual(curve.style.fillOpacity, fOp)) curve.style.fillOpacity = fOp;
                    
                    const sOp = def.strokeOpacity ?? 1;
                    if (!almostEqual(curve.style.strokeOpacity, sOp)) curve.style.strokeOpacity = sOp;
                    
                    if (def.fillColor && curve.style.fillColor !== def.fillColor) curve.style.fillColor = def.fillColor;

                } else if (def.type === 'SHAPE') {
                    const shape = item as OBRShape;
                    
                    const targetX = token.position.x + def.x;
                    const targetY = token.position.y + def.y;
                    if (!almostEqual(shape.position.x, targetX) || !almostEqual(shape.position.y, targetY)) {
                        shape.position = { x: targetX, y: targetY };
                    }

                    if (!almostEqual(shape.width, def.width)) shape.width = def.width;
                    if (!almostEqual(shape.height, def.height)) shape.height = def.height;
                    if (shape.style.fillColor !== def.color) shape.style.fillColor = def.color;
                    if (!almostEqual(shape.style.fillOpacity, def.fillOpacity)) shape.style.fillOpacity = def.fillOpacity;
                    
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
                    if (!almostEqual(txt.text.style.strokeWidth, sWidth)) txt.text.style.strokeWidth = sWidth;
                    
                    if (def.color && txt.text.style.fillColor !== def.color) txt.text.style.fillColor = def.color;
                    if (def.fontFamily && txt.text.style.fontFamily !== def.fontFamily) txt.text.style.fontFamily = def.fontFamily;
                }
            }
        });
    }
}