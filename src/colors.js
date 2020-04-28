const defaultColor = 0
const typeColors = {
  'Boolean': 20,
  'Number': 60,
  'String': 160,
  'Any': defaultColor
}
const typeToColor = (type) => {
  if (isFunction(type)) return interpolateColors(functionTypeToList(type))
  if (isVarType(type)) return defaultColor
  return typeColors[type] || defaultColor
}

const interpolateColors = (types) => types.map(typeToColor).reduce((c1, c2) => c1 + c2, 0)