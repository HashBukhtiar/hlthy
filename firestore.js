import React from 'react';
import { View, TouchableOpacity, Text } from 'react-native';
import { getFirestore, collection, query, getDocs, doc, addDoc, setDoc } from 'firebase/firestore';

const Firestore = () => {
    const database = getFirestore();
    const userRef = collection(database, 'users');

    const readData = async () => {
        try {
            const snapshot = await getDocs(query(userRef));
            // console.log(snapshot);
            snapshot.forEach((doc) => {
                let obj = doc.data();
                console.log(obj);
            });
        } catch (e) {
            alert(e);
            // console.error('Error reading document: ', e);
        }
    }

    const addData = async () => {
        try {
            let user = { name: "John Doe", username: "johndoe"}
            await addDoc(userRef, user);
        } catch (e) {
            alert(e);
            // console.error('Error adding document: ', e);
        }
    }

    return (
        <View>
            <TouchableOpacity onPress={addData}>
                <Text>Add Data</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={readData}>
                <Text>Read Data</Text>
            </TouchableOpacity>
        </View>
    );
}

export default Firestore;