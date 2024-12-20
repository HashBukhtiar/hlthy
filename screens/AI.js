import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
});

export default function AI() { 
    return (
        <View style={styles.container}>
            <Text>AI Screen</Text>
        </View>
    );
};