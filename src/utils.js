// Blockly
const isBlockInput = input => input.type === 1

const isEmptyInput = input => !input.connection.targetConnection

const isEmptyBlockInput = input => isBlockInput(input) && isEmptyInput(input)

const isFullyBlockInput = input => isBlockInput(input) && !isEmptyInput(input)

const getInputField = input => input.fieldRow[0].getValue()

const blockInputs = block => block.inputList.filter(isBlockInput)

const removeInput = block => input => block.removeInput(input.name)

const renameField = (input, name) => {
  input.removeField()
  input.appendField(name)
}

const copyBlock = (workspace, block) => Blockly.Xml.domToBlock(Blockly.Xml.blockToDom(block), workspace)

const connectInputBlock = (block, parameterBlock, inputIndex) => {
  block.inputList
    .filter(isBlockInput)[inputIndex]
    .connection.connect(parameterBlock.outputConnection)
}

// Block creation
const newBlockWithFields = (workspace, type, fields = {}) => {
  const newBlock = workspace.newBlock(type)
  Object.entries(fields).forEach(([fieldName, value]) => {
    newBlock.setFieldValue(value, fieldName);
  });
  return newBlock
}

const newFunction = (workspace, type, ...args) => {
  const block = newBlockWithFields(workspace, type)
  args.forEach((arg, i) => { if (arg) { connect(block, arg, i) } })
  return block
}

const newBoolean = (workspace, value) =>
  newBlockWithFields(workspace, "logic_boolean", { "BOOL": value ? "TRUE" : "FALSE" })

const newNumber = (workspace, value) =>
  newBlockWithFields(workspace, "math_number", { "NUM": value })

const newString = (workspace, value) =>
  newBlockWithFields(workspace, "text", { "TEXT": value })

const newList = (workspace, elementBlocks) => {
  const list = workspace.newBlock('list')
  elementBlocks.forEach((e, i) => {
    appendNewInputList(list)
    connectInputBlock(list, e, i)
  })
  return list
}

// INTERPRETER
const getBooleanValue = block => resultFieldValue(block, "BOOL") == "TRUE"

// LIST
const isOrganizedList = block =>
  block.inputList.filter(isEmptyBlockInput).length === 1 &&
  isEmptyBlockInput(last(block.inputList.filter(isBlockInput)))

const organizeList = block => {
  if (!isOrganizedList(block)) {
    block.inputList
      .filter(isEmptyBlockInput)
      .forEach(removeInput(block))
    appendNewInputList(block)
  }
}

const appendNewInputList = (block, inputName = `ELEMENT${block.inputIndex++}`) => {
  block.appendValueInput(inputName)
    .appendField(",")
    .inputType = createType("a")
  block.moveInputBefore(inputName, "CLOSE")
  renameField(block.inputList[0], "[")
}

const allListElements = blockList =>
  blockList.inputList
    .filter(input => input.name.includes("ELEMENT") && input.connection.targetBlock())
    .map(input => input.connection.targetBlock())
// Blockly

// Iterables
const last = list => list.reverse()[0]

const zipWith = (f) => (aList, anotherList) => aList.map((x, i) => f(x, anotherList[i]))

const zip = zipWith((x, y) => [x, y])

const zipObjects = (obj1, obj2) =>
  Object.fromEntries(Object.entries(obj1).filter(([key, _]) => obj2[key]).map(([key, value]) => [key, [value, obj2[key]]]))

const mapValues = (f) => (object) =>
  Object.fromEntries(Object.entries(object).map(([key, value], i) => [key, f(value, i)]))

const intersect = (aList, anotherList) =>
  aList.filter(value => -1 !== anotherList.indexOf(value))

const hasSameKeys = (obj1, obj2) =>
  Object.keys(obj1).every(key1 => Object.keys(obj2).includes(key1)) &&
  Object.keys(obj2).every(key2 => Object.keys(obj1).includes(key2))
// Iterables

// Others
const add = (n1, n2) => n1 + n2
// Others
