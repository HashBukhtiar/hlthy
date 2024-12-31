import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  dropdown: { backgroundColor: '#ddd', padding: 8, marginTop: 4, borderRadius: 4 },
  dropdownItem: { paddingVertical: 4 },
  messageBubble: { backgroundColor: '#eee', padding: 8, borderRadius: 4 },
});

export default function AiTrainer() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [plan, setPlan] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  const navigation = useNavigation();

  const handleSend = () => {
    if (!input.trim()) return;
    const newMessage = { id: Date.now().toString(), text: input.trim(), user: 'user' };
    setMessages([...messages, newMessage]);
    setInput('');
  };

  const togglePlanDropdown = () => setShowDropdown(!showDropdown);
  const selectPlan = (planType) => {
    console.log(`Plan selected: "${planType}"`);
    console.log(`Trimmed plan type: "${planType.trim()}"`);
    setPlan(planType);
    setShowDropdown(false);
    if (planType.trim() === 'Workout Plan') {
      console.log("WorkoutPlan pressed");
      navigation.navigate('WorkoutPlan');
    } else {
      console.log(`Plan type does not match: "${planType.trim()}"`);
    }
  };

  return (
    <View style={styles.container}>
      {/* Dropdown */}
      <View style={{ marginBottom: 16 }}>
        <TouchableOpacity onPress={togglePlanDropdown}>
          <Text style={{ fontSize: 18, fontWeight: 'bold' }}>
            Your Plan{plan ? `: ${plan}` : ''}
          </Text>
        </TouchableOpacity>
        {showDropdown && (
          <View style={styles.dropdown}>
            {['Workout Plan', 'Diet Plan', 'Both Plans'].map((option) => (
              <TouchableOpacity
                key={option}
                onPress={() => selectPlan(option)}
                style={styles.dropdownItem}
              >
                <Text>{option}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* Current Plan */}
      <View style={{ marginBottom: 16 }}>
        <Text style={{ fontSize: 16 }}>
          Current Plan: {plan || 'None'}
        </Text>
      </View>

      {/* Chat History */}
      <FlatList
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View
            style={[
              { marginVertical: 4 },
              { alignSelf: item.user === 'user' ? 'flex-end' : 'flex-start' },
            ]}
          >
            <Text style={styles.messageBubble}>{item.text}</Text>
          </View>
        )}
        style={{ flex: 1 }}
      />

      {/* Input */}
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <TextInput
          style={{
            flex: 1,
            borderWidth: 1,
            borderColor: '#ccc',
            borderRadius: 4,
            padding: 8,
          }}
          value={input}
          onChangeText={setInput}
          placeholder="Ask your AI trainer..."
        />
        <TouchableOpacity
          onPress={handleSend}
          style={{ marginLeft: 8, padding: 8, backgroundColor: 'blue', borderRadius: 4 }}
        >
          <Text style={{ color: '#fff' }}>Send</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}