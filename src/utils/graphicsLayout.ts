import type { GraphicsData } from './graphicsDataBuilder';
import type { GraphicDefinition } from './graphicsTypes';

function getHealthColor(percentage: number): string {
    if (percentage > 0.5) return '#4CAF50';
    if (percentage > 0.2) return '#FF9800';
    return '#F44336';
}

export function buildGraphicDefinitions(
    data: GraphicsData,
    role: 'PLAYER' | 'GM',
    isTokenVisible: boolean,
    tokenScale: number
): Record<string, GraphicDefinition> {
    const scale = tokenScale * ((data.trackerScale ?? 100) / 100);

    const healthPercentage = Math.max(0, Math.min(1, data.hpCurr / Math.max(1, data.hpMax)));
    const tempHpPercentage =
        data.temporaryHitPointsMax > 0
            ? Math.max(0, Math.min(1, data.temporaryHitPoints / data.temporaryHitPointsMax))
            : 0;

    const willPercentage = Math.max(0, Math.min(1, data.willCurr / Math.max(1, data.willMax)));

    const barWidth = 112 * scale;
    const startX = -barWidth / 2 + data.xOffset * scale;
    const baseY = (85 + data.yOffset) * scale;

    const healthBaseX = startX + data.hpOffsetX * scale;
    const healthBaseY = baseY - 19 * scale + data.hpOffsetY * scale;
    const healthCenterX = -barWidth / 2 + data.xOffset * scale + data.hpOffsetX * scale;

    const willBaseX = startX + data.willOffsetX * scale;
    const willBaseY = baseY - 2 * scale + data.willOffsetY * scale;
    const willCenterX = -barWidth / 2 + data.xOffset * scale + data.willOffsetX * scale;

    const graphicDefinitions: Record<string, GraphicDefinition> = {};

    if (data.showHpBar) {
        const isVisible = (!data.gmHpBar || role === 'GM') && isTokenVisible;

        const finalHpColor = data.temporaryHitPoints > 0 ? '#c326df' : getHealthColor(healthPercentage);

        graphicDefinitions['hp-shadow'] = {
            type: 'CURVE',
            points: [
                { x: healthBaseX + 1.5 * scale, y: healthBaseY + 2 * scale },
                { x: healthBaseX + barWidth + 1.5 * scale, y: healthBaseY + 2 * scale }
            ],
            color: '#000000',
            strokeOpacity: 0.4,
            width: 14 * scale,
            closed: false,
            fillOpacity: 0,
            z: 0,
            visible: isVisible
        };
        graphicDefinitions['hp-outline'] = {
            type: 'CURVE',
            points: [
                { x: healthBaseX, y: healthBaseY },
                { x: healthBaseX + barWidth, y: healthBaseY }
            ],
            color: '#FFFFFF',
            strokeOpacity: 1,
            width: 14 * scale,
            closed: false,
            fillOpacity: 0,
            z: 1,
            visible: isVisible
        };
        graphicDefinitions['hp-bg'] = {
            type: 'CURVE',
            points: [
                { x: healthBaseX, y: healthBaseY },
                { x: healthBaseX + barWidth, y: healthBaseY }
            ],
            color: '#222222',
            strokeOpacity: 1,
            width: 12 * scale,
            closed: false,
            fillOpacity: 0,
            z: 2,
            visible: isVisible
        };

        // Base HP bar (Green/Yellow/Red)
        graphicDefinitions['hp-fill'] = {
            type: 'CURVE',
            points: [
                { x: healthBaseX, y: healthBaseY },
                { x: healthBaseX + barWidth * Math.max(0.001, healthPercentage), y: healthBaseY }
            ],
            color: finalHpColor,
            strokeOpacity: 1,
            width: 12 * scale,
            closed: false,
            fillOpacity: 0,
            z: 3,
            visible: isVisible && healthPercentage > 0
        };

        // Temp HP bar (Purple overlay) - Only render if tempHp is actually greater than 0
        if (tempHpPercentage > 0) {
            graphicDefinitions['temp-hp-fill'] = {
                type: 'CURVE',
                points: [
                    { x: healthBaseX, y: healthBaseY },
                    { x: healthBaseX + barWidth * Math.max(0.001, tempHpPercentage), y: healthBaseY }
                ],
                color: '#c326df',
                strokeOpacity: 1,
                width: 12 * scale,
                closed: false,
                fillOpacity: 0,
                z: 4,
                visible: isVisible
            };
        }
    }

    if (data.showHpText) {
        const isVisible = (!data.gmHpText || role === 'GM') && isTokenVisible;
        const hpString =
            data.temporaryHitPoints > 0
                ? `${data.hpCurr}+${data.temporaryHitPoints}/${data.hpMax}`
                : `${data.hpCurr}/${data.hpMax}`;

        graphicDefinitions['hp-text'] = {
            type: 'TEXT',
            text: hpString,
            x: healthCenterX,
            y: healthBaseY - 15 * scale,
            width: barWidth,
            height: 30 * scale,
            align: 'CENTER',
            vAlign: 'MIDDLE',
            size: 11 * scale,
            weight: 800,
            stroke: 0,
            color: '#FFFFFF',
            fontFamily: 'Arial, sans-serif',
            z: 5,
            visible: isVisible
        };
    }

    if (data.showWillBar) {
        const isVisible = (!data.gmWillBar || role === 'GM') && isTokenVisible;
        graphicDefinitions['will-shadow'] = {
            type: 'CURVE',
            points: [
                { x: willBaseX + 1.5 * scale, y: willBaseY + 2 * scale },
                { x: willBaseX + barWidth + 1.5 * scale, y: willBaseY + 2 * scale }
            ],
            color: '#000000',
            strokeOpacity: 0.4,
            width: 14 * scale,
            closed: false,
            fillOpacity: 0,
            z: 0,
            visible: isVisible
        };
        graphicDefinitions['will-outline'] = {
            type: 'CURVE',
            points: [
                { x: willBaseX, y: willBaseY },
                { x: willBaseX + barWidth, y: willBaseY }
            ],
            color: '#FFFFFF',
            strokeOpacity: 1,
            width: 14 * scale,
            closed: false,
            fillOpacity: 0,
            z: 1,
            visible: isVisible
        };
        graphicDefinitions['will-bg'] = {
            type: 'CURVE',
            points: [
                { x: willBaseX, y: willBaseY },
                { x: willBaseX + barWidth, y: willBaseY }
            ],
            color: '#222222',
            strokeOpacity: 1,
            width: 12 * scale,
            closed: false,
            fillOpacity: 0,
            z: 2,
            visible: isVisible
        };

        graphicDefinitions['will-fill'] = {
            type: 'CURVE',
            points: [
                { x: willBaseX, y: willBaseY },
                { x: willBaseX + barWidth * Math.max(0.001, willPercentage), y: willBaseY }
            ],
            color: '#2196F3',
            strokeOpacity: 1,
            width: 12 * scale,
            closed: false,
            fillOpacity: 0,
            z: 3,
            visible: isVisible && willPercentage > 0
        };
    }

    if (data.showWillText) {
        const isVisible = (!data.gmWillText || role === 'GM') && isTokenVisible;
        graphicDefinitions['will-text'] = {
            type: 'TEXT',
            text: `${data.willCurr}/${data.willMax}`,
            x: willCenterX,
            y: willBaseY - 15 * scale,
            width: barWidth,
            height: 30 * scale,
            align: 'CENTER',
            vAlign: 'MIDDLE',
            size: 11 * scale,
            weight: 800,
            stroke: 0,
            color: '#FFFFFF',
            fontFamily: 'Arial, sans-serif',
            z: 5,
            visible: isVisible
        };
    }

    if (data.showDef) {
        const isVisible = (!data.gmDef || role === 'GM') && isTokenVisible;
        const defenseSpecialDefenseY = baseY - 37 * scale + data.defOffsetY * scale;
        const defenseSpecialDefenseWidth = 24 * scale;

        const defenseSpecialDefenseX2 = startX + barWidth + data.defOffsetX * scale;
        const defenseSpecialDefenseX1 = defenseSpecialDefenseX2 - defenseSpecialDefenseWidth;
        const defenseSpecialDefenseMidpoint = defenseSpecialDefenseX1 + defenseSpecialDefenseWidth / 2;

        graphicDefinitions['def-spd-shadow'] = {
            type: 'CURVE',
            points: [
                { x: defenseSpecialDefenseX1 + 1.5 * scale, y: defenseSpecialDefenseY + 2 * scale },
                { x: defenseSpecialDefenseX2 + 1.5 * scale, y: defenseSpecialDefenseY + 2 * scale }
            ],
            color: '#000000',
            strokeOpacity: 0.4,
            width: 14 * scale,
            closed: false,
            fillOpacity: 0,
            z: 0,
            visible: isVisible
        };
        graphicDefinitions['def-spd-base'] = {
            type: 'CURVE',
            points: [
                { x: defenseSpecialDefenseX1, y: defenseSpecialDefenseY },
                { x: defenseSpecialDefenseX2, y: defenseSpecialDefenseY }
            ],
            color: '#D9D9D9',
            strokeOpacity: 0.6,
            width: 14 * scale,
            closed: false,
            fillOpacity: 0,
            z: 2,
            visible: isVisible
        };
        graphicDefinitions['def-spd-div'] = {
            type: 'CURVE',
            points: [
                { x: defenseSpecialDefenseMidpoint, y: defenseSpecialDefenseY - 5 * scale },
                { x: defenseSpecialDefenseMidpoint, y: defenseSpecialDefenseY + 5 * scale }
            ],
            color: '#FFFFFF',
            strokeOpacity: 1,
            width: 1.5 * scale,
            closed: false,
            fillOpacity: 0,
            z: 3,
            visible: isVisible
        };

        const defenseTextX = defenseSpecialDefenseX1 - 8 * scale;
        const specialDefenseTextX = defenseSpecialDefenseX2 - 12 * scale;
        const defenseTextY = defenseSpecialDefenseY - 9.8 * scale;

        graphicDefinitions['def-text'] = {
            type: 'TEXT',
            text: String(data.defTotal),
            x: defenseTextX,
            y: defenseTextY,
            width: 20 * scale,
            height: 20 * scale,
            align: 'CENTER',
            vAlign: 'MIDDLE',
            size: 12 * scale,
            weight: 700,
            stroke: 0,
            color: '#FFFFFF',
            fontFamily: 'Arial, sans-serif',
            z: 5,
            visible: isVisible
        };
        graphicDefinitions['spd-text'] = {
            type: 'TEXT',
            text: String(data.sdefTotal),
            x: specialDefenseTextX,
            y: defenseTextY,
            width: 20 * scale,
            height: 20 * scale,
            align: 'CENTER',
            vAlign: 'MIDDLE',
            size: 12 * scale,
            weight: 700,
            stroke: 0,
            color: '#FFFFFF',
            fontFamily: 'Arial, sans-serif',
            z: 5,
            visible: isVisible
        };
    }

    if (data.showEco) {
        const badgeCenterY = baseY + 18 * scale;
        const isVisible = (!data.gmEco || role === 'GM') && isTokenVisible;

        const badgeWidth = 16 * scale;
        const badgeHeight = 16 * scale;

        const baseXLocal = data.xOffset * scale;
        const baseActionX = baseXLocal - 55 * scale;
        const baseClashX = baseXLocal - 8 * scale;
        const baseEvadeX = baseXLocal - 27 * scale;

        const badges = [
            {
                id: 'badge-act',
                value: data.actions,
                color: data.colorAct,
                centerX: baseActionX + data.actOffsetX * scale,
                centerY: badgeCenterY + data.actOffsetY * scale
            },
            {
                id: 'badge-eva',
                value: data.evadeUsed ? '✓' : '◯',
                color: data.colorEva,
                centerX: baseEvadeX + data.evaOffsetX * scale,
                centerY: badgeCenterY + data.evaOffsetY * scale
            },
            {
                id: 'badge-cla',
                value: data.clashUsed ? '✓' : '◯',
                color: data.colorCla,
                centerX: baseClashX + data.claOffsetX * scale,
                centerY: badgeCenterY + data.claOffsetY * scale
            }
        ];

        badges.forEach((badge) => {
            const boxX = badge.centerX - badgeWidth / 2;
            const boxY = badge.centerY - badgeHeight / 2;

            const textXOffset = 0.3 * scale;
            let textYOffset = 0;

            if (typeof badge.value === 'number') textYOffset = -0.5 * scale;
            else if (badge.value === '◯') textYOffset = 0.5 * scale;
            else if (badge.value === '✓') textYOffset = 0.8 * scale;

            const finalTextX = boxX + textXOffset;
            const finalTextY = boxY + textYOffset;

            graphicDefinitions[`${badge.id}-shadow`] = {
                type: 'SHAPE',
                shapeType: 'CIRCLE',
                color: '#000000',
                x: badge.centerX + 1.5 * scale,
                y: badge.centerY + 2 * scale,
                width: badgeWidth,
                height: badgeHeight,
                fillOpacity: 0.4,
                strokeWidth: 0,
                z: 0,
                visible: isVisible
            };
            graphicDefinitions[`${badge.id}-bg`] = {
                type: 'SHAPE',
                shapeType: 'CIRCLE',
                color: badge.color,
                x: badge.centerX,
                y: badge.centerY,
                width: badgeWidth,
                height: badgeHeight,
                fillOpacity: 0.6,
                strokeWidth: 0,
                z: 2,
                visible: isVisible
            };
            graphicDefinitions[`${badge.id}-fg`] = {
                type: 'TEXT',
                text: String(badge.value),
                x: finalTextX,
                y: finalTextY,
                width: badgeWidth,
                height: badgeHeight,
                align: 'CENTER',
                vAlign: 'MIDDLE',
                size: 12 * scale,
                weight: 600,
                stroke: 0,
                color: '#FFFFFF',
                fontFamily: 'Arial, sans-serif',
                z: 4,
                visible: isVisible
            };
        });
    }

    return graphicDefinitions;
}
