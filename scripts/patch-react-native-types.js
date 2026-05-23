const fs = require('fs');
const path = require('path');

const files = [
  'node_modules/react-native/Libraries/Components/ActivityIndicator/ActivityIndicator.d.ts',
  'node_modules/react-native/Libraries/Components/DrawerAndroid/DrawerLayoutAndroid.d.ts',
  'node_modules/react-native/Libraries/Components/Keyboard/KeyboardAvoidingView.d.ts',
  'node_modules/react-native/Libraries/Components/ProgressBarAndroid/ProgressBarAndroid.d.ts',
  'node_modules/react-native/Libraries/Components/RefreshControl/RefreshControl.d.ts',
  'node_modules/react-native/Libraries/Components/SafeAreaView/SafeAreaView.d.ts',
  'node_modules/react-native/Libraries/Components/ScrollView/ScrollView.d.ts',
  'node_modules/react-native/Libraries/Components/Switch/Switch.d.ts',
  'node_modules/react-native/Libraries/Components/TextInput/TextInput.d.ts',
  'node_modules/react-native/Libraries/Components/Touchable/TouchableNativeFeedback.d.ts',
  'node_modules/react-native/Libraries/Components/Touchable/TouchableWithoutFeedback.d.ts',
  'node_modules/react-native/Libraries/Components/View/View.d.ts',
  'node_modules/react-native/Libraries/Image/Image.d.ts',
  'node_modules/react-native/Libraries/Text/Text.d.ts',
];

let patched = 0;

for (const relativeFile of files) {
  const file = path.join(__dirname, '..', relativeFile);
  if (!fs.existsSync(file)) continue;

  const source = fs.readFileSync(file, 'utf8');
  const next = source.replace(
    /(export\s+)?declare const (\w+Base):[\s\S]*?typeof (\w+Component);/g,
    (_match, exported = '', base, component) => `${exported}declare const ${base}: typeof ${component};`,
  ).replace(
    /export class TextInput extends TextInputBase \{\n(?!  focus: \(\) => void;)/,
    'export class TextInput extends TextInputBase {\n  focus: () => void;\n  blur: () => void;\n',
  );

  if (next !== source) {
    fs.writeFileSync(file, next);
    patched += 1;
  }
}

if (patched > 0) {
  console.log(`Patched ${patched} React Native declaration files for JSX compatibility.`);
}
