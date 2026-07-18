function normalizeText(value) {
  return (value || '').toString().trim();
}

function buildItemPayload({ name, displayName, itemValue, game = 'GAG2', itemType = null, itemImage = '' }) {
  const itemName = normalizeText(name);
  const displayNameValue = normalizeText(displayName) || itemName;
  const normalizedGame = normalizeText(game) || 'GAG2';
  const normalizedType = normalizeText(itemType).toLowerCase();
  const inferredType = normalizedType || (itemName.toLowerCase().includes('seed') ? 'seed' : 'pet');

  return {
    item_name: itemName,
    display_name: displayNameValue,
    item_value: String(itemValue ?? 0),
    game: normalizedGame,
    item_type: inferredType,
    item_image: normalizeText(itemImage),
  };
}

module.exports = {
  buildItemPayload,
};
