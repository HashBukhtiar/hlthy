import React, { useState } from 'react';
import {
  View,
  ScrollView,
  Text,
  StyleSheet,
  Switch,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { Dropdown } from 'react-native-element-dropdown';

const unitsData = [
  { label: 'Metric (kg)', value: 'metric' },
  { label: 'Imperial (lbs)', value: 'imperial' },
];

export default function Settings() {
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [locationEnabled, setLocationEnabled] = useState(false);
  const [units, setUnits] = useState('metric');

  const saveSettings = () => {
    console.log('Settings saved:', {
      name,
      username,
      notificationsEnabled,
      locationEnabled,
      units,
    });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Settings</Text>

      <ScrollView style={styles.card}>
        <Text style={styles.subheader}>Profile</Text>
        <View style={styles.itemRow}>
          <Text style={styles.label}>Name</Text>
          <TextInput
            style={styles.input}
            onChangeText={setName}
            value={name}
            placeholder="Enter your name"
            placeholderTextColor="#ccc"
          />
        </View>

        <View style={styles.itemRow}>
          <Text style={styles.label}>Username</Text>
          <TextInput
            style={styles.input}
            onChangeText={setUsername}
            value={username}
            placeholder="Enter your username"
            placeholderTextColor="#ccc"
          />
        </View>

        <Text style={styles.subheader}>General</Text>
        <View style={styles.itemRow}>
          <Text style={styles.label}>Notifications</Text>
          <Switch
            onValueChange={setNotificationsEnabled}
            value={notificationsEnabled}
            trackColor={{ false: '#767577', true: '#81b0ff' }}
            thumbColor={notificationsEnabled ? '#f5dd4b' : '#f4f3f4'}
          />
        </View>

        <View style={styles.itemRow}>
          <Text style={styles.label}>Location</Text>
          <Switch
            onValueChange={setLocationEnabled}
            value={locationEnabled}
            trackColor={{ false: '#767577', true: '#81b0ff' }}
            thumbColor={locationEnabled ? '#f5dd4b' : '#f4f3f4'}
          />
        </View>

        <View style={styles.itemRow}>
          <Text style={styles.label}>Measurement Units</Text>
          <Dropdown
            data={unitsData}
            labelField="label"
            valueField="value"
            value={units}
            onChange={item => setUnits(item.value)}
            style={styles.dropdown}
            placeholder="Select Units"
            placeholderStyle={styles.placeholderStyle}
            selectedTextStyle={styles.selectedTextStyle}
          />
        </View>
      </ScrollView>

      <TouchableOpacity style={styles.saveButton} onPress={saveSettings}>
        <Text style={styles.saveButtonText}>Save Settings</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
    padding: 16,
  },
  header: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '600',
    marginBottom: 10,
    textAlign: 'center',
  },
  subheader: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 10,
    marginTop: 10,
  },
  card: {
    backgroundColor: '#1E1E1E',
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  label: {
    color: '#fff',
    fontSize: 16,
    flex: 1,
  },
  input: {
    flex: 2,
    height: 40,
    borderColor: '#555',
    borderWidth: 1,
    borderRadius: 5,
    paddingHorizontal: 10,
    color: '#fff',
    backgroundColor: '#333',
  },
  dropdown: {
    flex: 1,
    marginLeft: 10,
    borderWidth: 1,
    borderColor: '#555',
    borderRadius: 5,
    paddingHorizontal: 10,
    backgroundColor: '#333',
  },
  placeholderStyle: {
    color: '#ccc',
  },
  selectedTextStyle: {
    color: '#fff',
  },
  saveButton: {
    backgroundColor: '#2196f3',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 'auto',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});