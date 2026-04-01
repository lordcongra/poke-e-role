import OBR, { buildCurve, buildText, buildShape } from '@owlbear-rodeo/sdk';
import type { Item, Curve, Text as OBRText, Shape as OBRShape } from '@owlbear-rodeo/sdk';
import type { GraphicDefinition } from './graphicsTypes';
import { SEVERED_BEHAVIORS, CURRENT_VERSION } from './graphicsTypes';
import { GRAPHICS_META_ID } from './graphicsManager';

const almostEqual = (valueA: number, valueB: number) => Math.abs(valueA - valueB) < 0.01;

export async function applyGraphicsToOwlbear(
    token: Item,
    graphicDefinitions: Record<string, GraphicDefinition>,
    localAttachedItems: Item[]
) {
    const itemsToDelete: string[] = [];
    const validExistingItems: Item[] = [];
    const foundRoles = new Set<string>();

    for (const item of localAttachedItems) {
        const role = item.metadata[GRAPHICS_META_ID] as string;
        const definition = graphicDefinitions[role];
        const explicitId = `${token.id}-${role}${CURRENT_VERSION}`;

        if (
            !definition ||
            item.id !== explicitId ||
            item.type !== definition.type ||
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
        try {
            await OBR.scene.local.deleteItems(itemsToDelete);
        } catch (error) {
            console.error('Error deleting graphics:', error);
        }
    }

    const itemsToCreate: Item[] = [];

    for (const [role, definition] of Object.entries(graphicDefinitions)) {
        const explicitId = `${token.id}-${role}${CURRENT_VERSION}`;
        const existing = validExistingItems.find((item) => item.id === explicitId);

        if (!existing && definition.visible) {
            if (definition.type === 'CURVE') {
                const curveObject = buildCurve()
                    .id(explicitId)
                    .name('')
                    .points(definition.points)
                    .strokeColor(definition.color)
                    .strokeWidth(definition.width)
                    .fillOpacity(definition.fillOpacity ?? 0)
                    .closed(definition.closed)
                    .tension(0)
                    .position(token.position)
                    .attachedTo(token.id)
                    .disableHit(true)
                    .locked(true)
                    .layer('ATTACHMENT')
                    .zIndex(definition.z)
                    .metadata({ [GRAPHICS_META_ID]: role })
                    .visible(definition.visible)
                    .build();

                if (definition.fillColor) curveObject.style.fillColor = definition.fillColor;
                curveObject.style.strokeOpacity = definition.strokeOpacity ?? 1;
                curveObject.disableAttachmentBehavior = SEVERED_BEHAVIORS;
                itemsToCreate.push(curveObject);
            } else if (definition.type === 'SHAPE') {
                const shapeObject = buildShape()
                    .shapeType(definition.shapeType)
                    .name('')
                    .width(definition.width)
                    .height(definition.height)
                    .fillColor(definition.color)
                    .fillOpacity(definition.fillOpacity)
                    .id(explicitId)
                    .position({ x: token.position.x + definition.x, y: token.position.y + definition.y })
                    .attachedTo(token.id)
                    .disableHit(true)
                    .locked(true)
                    .layer('ATTACHMENT')
                    .zIndex(definition.z)
                    .metadata({ [GRAPHICS_META_ID]: role })
                    .visible(definition.visible)
                    .build();

                shapeObject.style.strokeColor = definition.strokeColor || 'transparent';
                shapeObject.style.strokeWidth = definition.strokeWidth || 0;
                shapeObject.style.strokeOpacity = definition.strokeOpacity ?? 1;
                shapeObject.disableAttachmentBehavior = SEVERED_BEHAVIORS;
                itemsToCreate.push(shapeObject);
            } else if (definition.type === 'TEXT') {
                const textObject = buildText()
                    .id(explicitId)
                    .name('')
                    .textType('PLAIN')
                    .plainText(definition.text)
                    .position({ x: token.position.x + definition.x, y: token.position.y + definition.y })
                    .width(definition.width)
                    .height(definition.height)
                    .textAlign(definition.align)
                    .textAlignVertical(definition.vAlign)
                    .attachedTo(token.id)
                    .disableHit(true)
                    .locked(true)
                    .layer('ATTACHMENT')
                    .zIndex(definition.z)
                    .metadata({ [GRAPHICS_META_ID]: role })
                    .visible(definition.visible)
                    .build();

                textObject.text.style.fontSize = definition.size;
                textObject.text.style.fontWeight = definition.weight;
                textObject.text.style.fillColor = definition.color || '#FFFFFF';
                textObject.text.style.fillOpacity = 1;
                textObject.text.style.strokeColor = '#000000';
                textObject.text.style.strokeOpacity = definition.stroke > 0 ? 1 : 0;
                textObject.text.style.strokeWidth = definition.stroke;
                if (definition.fontFamily) textObject.text.style.fontFamily = definition.fontFamily;
                textObject.disableAttachmentBehavior = SEVERED_BEHAVIORS;
                itemsToCreate.push(textObject);
            }
        }
    }

    if (itemsToCreate.length > 0) {
        try {
            await OBR.scene.local.addItems(itemsToCreate);
        } catch (error) {
            console.error('Error creating graphics:', error);
        }
    }

    if (validExistingItems.length > 0) {
        try {
            await OBR.scene.local.updateItems(
                validExistingItems.map((item) => item.id),
                (updatedItems) => {
                    for (const item of updatedItems) {
                        const role = item.metadata[GRAPHICS_META_ID] as string;
                        const definition = graphicDefinitions[role];
                        if (!definition) continue;

                        if (item.name !== '') item.name = '';

                        const behaviors = item.disableAttachmentBehavior || [];
                        if (!behaviors.includes('SCALE') || !behaviors.includes('ROTATION')) {
                            item.disableAttachmentBehavior = SEVERED_BEHAVIORS;
                        }

                        if (item.scale.x !== 1 || item.scale.y !== 1) {
                            item.scale = { x: 1, y: 1 };
                        }

                        if (item.visible !== definition.visible) item.visible = definition.visible;

                        if (definition.type === 'CURVE') {
                            const curveItem = item as Curve;

                            if (
                                !almostEqual(curveItem.position.x, token.position.x) ||
                                !almostEqual(curveItem.position.y, token.position.y)
                            ) {
                                curveItem.position = { x: token.position.x, y: token.position.y };
                            }

                            let pointsDiff = false;
                            if (curveItem.points.length !== definition.points.length) {
                                pointsDiff = true;
                            } else {
                                for (let index = 0; index < definition.points.length; index++) {
                                    if (
                                        !almostEqual(curveItem.points[index].x, definition.points[index].x) ||
                                        !almostEqual(curveItem.points[index].y, definition.points[index].y)
                                    ) {
                                        pointsDiff = true;
                                        break;
                                    }
                                }
                            }
                            if (pointsDiff) curveItem.points = definition.points;

                            if (curveItem.style.strokeColor !== definition.color)
                                curveItem.style.strokeColor = definition.color;

                            if (!almostEqual(curveItem.style.strokeWidth, definition.width)) {
                                curveItem.style.strokeWidth = definition.width;
                            }

                            const strokeOpacityValue = definition.strokeOpacity ?? 1;
                            if (!almostEqual(curveItem.style.strokeOpacity, strokeOpacityValue)) {
                                curveItem.style.strokeOpacity = strokeOpacityValue;
                            }

                            if (definition.fillColor && curveItem.style.fillColor !== definition.fillColor) {
                                curveItem.style.fillColor = definition.fillColor;
                            }

                            const fillOpacityValue = definition.fillOpacity ?? 0;
                            if (!almostEqual(curveItem.style.fillOpacity, fillOpacityValue)) {
                                curveItem.style.fillOpacity = fillOpacityValue;
                            }
                        } else if (definition.type === 'SHAPE') {
                            const shapeItem = item as OBRShape;

                            const targetX = token.position.x + definition.x;
                            const targetY = token.position.y + definition.y;

                            if (
                                !almostEqual(shapeItem.position.x, targetX) ||
                                !almostEqual(shapeItem.position.y, targetY)
                            ) {
                                shapeItem.position = { x: targetX, y: targetY };
                            }

                            if (!almostEqual(shapeItem.width, definition.width)) shapeItem.width = definition.width;
                            if (!almostEqual(shapeItem.height, definition.height)) shapeItem.height = definition.height;
                            if (shapeItem.style.fillColor !== definition.color)
                                shapeItem.style.fillColor = definition.color;

                            if (!almostEqual(shapeItem.style.fillOpacity, definition.fillOpacity)) {
                                shapeItem.style.fillOpacity = definition.fillOpacity;
                            }

                            const shapeStrokeColor = definition.strokeColor || 'transparent';
                            if (shapeItem.style.strokeColor !== shapeStrokeColor) {
                                shapeItem.style.strokeColor = shapeStrokeColor;
                            }

                            const shapeStrokeWidth = definition.strokeWidth || 0;
                            if (!almostEqual(shapeItem.style.strokeWidth, shapeStrokeWidth)) {
                                shapeItem.style.strokeWidth = shapeStrokeWidth;
                            }

                            const shapeStrokeOpacity = definition.strokeOpacity ?? 1;
                            if (!almostEqual(shapeItem.style.strokeOpacity, shapeStrokeOpacity)) {
                                shapeItem.style.strokeOpacity = shapeStrokeOpacity;
                            }
                        } else if (definition.type === 'TEXT') {
                            const textItem = item as OBRText;

                            const targetX = token.position.x + definition.x;
                            const targetY = token.position.y + definition.y;

                            if (
                                !almostEqual(textItem.position.x, targetX) ||
                                !almostEqual(textItem.position.y, targetY)
                            ) {
                                textItem.position = { x: targetX, y: targetY };
                            }

                            if (textItem.text.plainText !== definition.text) textItem.text.plainText = definition.text;
                            if (!almostEqual(textItem.text.width as number, definition.width))
                                textItem.text.width = definition.width;
                            if (!almostEqual(textItem.text.height as number, definition.height))
                                textItem.text.height = definition.height;
                            if (!almostEqual(textItem.text.style.fontSize, definition.size))
                                textItem.text.style.fontSize = definition.size;

                            const textStrokeOpacity = definition.stroke > 0 ? 1 : 0;
                            if (!almostEqual(textItem.text.style.strokeOpacity, textStrokeOpacity)) {
                                textItem.text.style.strokeOpacity = textStrokeOpacity;
                            }

                            const textStrokeWidth = definition.stroke;
                            if (!almostEqual(textItem.text.style.strokeWidth, textStrokeWidth)) {
                                textItem.text.style.strokeWidth = textStrokeWidth;
                            }

                            if (definition.color && textItem.text.style.fillColor !== definition.color) {
                                textItem.text.style.fillColor = definition.color;
                            }

                            if (definition.fontFamily && textItem.text.style.fontFamily !== definition.fontFamily) {
                                textItem.text.style.fontFamily = definition.fontFamily;
                            }
                        }
                    }
                }
            );
        } catch (error) {
            console.error('Error updating graphics:', error);
        }
    }
}
