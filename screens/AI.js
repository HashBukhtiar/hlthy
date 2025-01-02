import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { sendMessage } from '../ai/ai_chat';

export default function AiTrainer() {
  const [messages, setMessages] = useState([
    { id: '1', text: 'Hello! I am your AI Trainer. How can I help you today?', user: 'ai' },
  ]);
  const [input, setInput] = useState('');
  const [plan, setPlan] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  const navigation = useNavigation();

  const handleSend = async () => {
    console.log('Send pressed');
    if (!input.trim()) return;
    const newMessage = { id: Date.now().toString(), text: input.trim(), user: 'user' };
    setMessages([...messages, newMessage]);
    setInput('');
  
    try {
      const aiReply = await sendMessage(input.trim());
      const aiResponse = { id: (Date.now() + 1).toString(), text: aiReply, user: 'ai' };
      setMessages((prev) => [...prev, aiResponse]);
    } catch (error) {
      console.error('Error calling AI:', error);
    }
  };

  const togglePlanDropdown = () => setShowDropdown(!showDropdown);

 const selectPlan = (planType) => {
    console.log("WorkoutPlan pressed");
    try {
        console.log(`Selecting plan: ${planType}`);
        setPlan(planType);
        setShowDropdown(false);
        
        if (planType === 'Workout Plan') {
          console.log('Attempting navigation to WorkoutPlan');
          navigation.navigate('WorkoutPlan');
        } else if (planType === 'Diet Plan') {
          console.log('Attempting navigation to DietPlan');
          navigation.navigate('DietPlan');
        }
      } catch (error) {
        console.error('Navigation error:', error);
        Alert.alert('Navigation Error', 'Could not navigate to plan');
      }
    };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 20}
    >
      <View style={styles.container}>
        {/* Dropdown */}
        <View style={{ marginBottom: 16 }}>
          <TouchableOpacity onPress={togglePlanDropdown}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: 'white' }}>
              Your Plan{plan ? `: ${plan}` : ''}
            </Text>
          </TouchableOpacity>
          {showDropdown && (
            <View style={styles.dropdown}>
              {['Workout Plan', 'Diet Plan', 'Both Plans'].map((option) => (
                <TouchableOpacity
                  key={option}
                  onPress={() => {
                    console.log(`WorkoutPlan Pressed`);
                    selectPlan(option);
                  }}
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
          <Text style={{ fontSize: 16, color: 'white'}}>
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
              <Text style={item.user === 'user' ? styles.userMessageBubble : styles.aiMessageBubble}>
                {item.text}
              </Text>
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
              color: 'white',
            }}
            value={input}
            onChangeText={setInput}
            placeholder="Ask your AI trainer..."
            placeholderTextColor="white"
          />
          <TouchableOpacity
            onPress={handleSend}
            style={{ marginLeft: 8, padding: 8, backgroundColor: 'blue', borderRadius: 4 }}
          >
            <Text style={{ color: 'white' }}>Send</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: 'black' },
  dropdown: { backgroundColor: '#ddd', padding: 8, marginTop: 4, borderRadius: 4 },
  dropdownItem: { paddingVertical: 4 },
  userMessageBubble: { backgroundColor: '#f9ccff', padding: 8, borderRadius: 4 },
  aiMessageBubble: { backgroundColor: '#ddd', padding: 8, borderRadius: 4 },
});