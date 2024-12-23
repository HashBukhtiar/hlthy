import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet } from 'react-native';

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
});

export default function AiTrainer() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');

  const handleSend = () => {
    if (!input.trim()) return;
    const newMessage = { id: Date.now().toString(), text: input.trim(), user: 'user' };
    setMessages([...messages, newMessage]);
    setInput('');
    // TODO: Call AI API here and add response to messages
  };

  return (
    <View style={{ flex: 1, padding: 16 }}>
      {/* Workout & Diet Summary */}
      <View style={{ marginBottom: 16 }}>
        <Text style={{ fontSize: 18, fontWeight: 'bold' }}>Your Plan</Text>
        {/* TODO: Display workout/diet plan summary here */}
      </View>

      {/* Chat History */}
      <FlatList
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={{ marginVertical: 4, alignSelf: item.user === 'user' ? 'flex-end' : 'flex-start' }}>
            <Text style={{ backgroundColor: '#eee', padding: 8, borderRadius: 4 }}>{item.text}</Text>
          </View>
        )}
        style={{ flex: 1 }}
      />

      {/* Input Field */}
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <TextInput
          style={{ flex: 1, borderWidth: 1, borderColor: '#ccc', borderRadius: 4, padding: 8 }}
          value={input}
          onChangeText={setInput}
          placeholder="Ask your AI trainer..."
        />
        <TouchableOpacity onPress={handleSend} style={{ marginLeft: 8, padding: 8, backgroundColor: 'blue', borderRadius: 4 }}>
          <Text style={{ color: '#fff' }}>Send</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}