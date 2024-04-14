import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';
import globalStyles from './styles/globalStyles';

export default function App() {
  return (
    <View style={styles.container}>
      <Text style={globalStyles.title}>hlthy</Text>
      <Text style={globalStyles.subtitle}>@hashbrown</Text>
      <Text style={globalStyles.caption}>caption</Text>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
});
