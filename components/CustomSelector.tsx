import React from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export interface SelectorItem {
    label: string;
    value: string;
    icon?: string;
    description?: string;
    image?: any;
}

interface CustomSelectorProps {
    items: SelectorItem[];
    value: string | null;
    onSelect: (value: string) => void;
    placeholder?: string;
    title: string;
    icon?: string;
    modalVisible: boolean;
    setModalVisible: (visible: boolean) => void;
}

export const CustomSelector = ({
    items,
    value,
    onSelect,
    placeholder = "Select option",
    title,
    icon = "options",
    modalVisible,
    setModalVisible
}: CustomSelectorProps) => {
    const selectedItem = items.find(item => item.value === value);

    return (
        <>
            <View style={styles.selectorContainer}>
                <View style={styles.selectorHeader}>
                    <Ionicons name={icon as any} size={20} color="#FFF" />
                    <Text style={styles.selectorTitle}>{title}</Text>
                </View>
                <TouchableOpacity 
                    style={styles.selector}
                    onPress={() => setModalVisible(true)}
                >
                    <View style={styles.selectedValue}>
                        {selectedItem?.icon && (
                            <Ionicons 
                                name={selectedItem.icon as any} 
                                size={18} 
                                color="#FFF" 
                            />
                        )}
                        <Text style={styles.selectedValueText}>
                            {selectedItem ? selectedItem.label : placeholder}
                        </Text>
                    </View>
                    <Ionicons name="chevron-down" size={18} color="#999" />
                </TouchableOpacity>
            </View>

            <Modal
                animationType="slide"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <TouchableOpacity 
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setModalVisible(false)}
                >
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>{title}</Text>
                        
                        {items.map((item) => (
                            <TouchableOpacity
                                key={item.value}
                                style={[
                                    styles.modalOption,
                                    value === item.value && styles.selectedOption
                                ]}
                                onPress={() => {
                                    onSelect(item.value);
                                    setModalVisible(false);
                                }}
                            >
                                <View style={styles.optionHeader}>
                                    {item.icon && (
                                        <Ionicons 
                                            name={item.icon as any} 
                                            size={20} 
                                            color={value === item.value ? "#ff2d55" : "#FFF"} 
                                        />
                                    )}
                                    <Text style={[
                                        styles.optionLabel,
                                        value === item.value && styles.selectedOptionText
                                    ]}>
                                        {item.label}
                                    </Text>
                                </View>
                                {item.description && (
                                    <Text style={styles.optionDescription}>
                                        {item.description}
                                    </Text>
                                )}
                            </TouchableOpacity>
                        ))}
                        
                        <TouchableOpacity 
                            style={styles.cancelButton}
                            onPress={() => setModalVisible(false)}
                        >
                            <Text style={styles.cancelButtonText}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>
        </>
    );
};

const styles = StyleSheet.create({
    selectorContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 0,
        paddingVertical: 16,
        marginBottom: 0,
    },
    selectorHeader: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    selectorTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFF',
        marginLeft: 8,
    },
    selector: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        borderRadius: 12,
        padding: 14,
        paddingHorizontal: 16,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.12)',
        minWidth: 160,
    },
    selectedValue: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 8,
    },
    selectedValueText: {
        color: '#FFF',
        marginLeft: 6,
        fontSize: 15,
        fontWeight: '500',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.8)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#1a1a1a',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
        maxHeight: '80%',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#FFF',
        marginBottom: 20,
        textAlign: 'center',
    },
    modalOption: {
        padding: 16,
        backgroundColor: '#333',
        marginBottom: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#444',
    },
    selectedOption: {
        borderColor: '#ff2d55',
        backgroundColor: 'rgba(255, 45, 85, 0.1)',
    },
    optionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 6,
    },
    optionLabel: {
        color: 'white',
        marginLeft: 10,
        fontSize: 16,
    },
    selectedOptionText: {
        fontWeight: 'bold',
        color: '#ff2d55',
    },
    optionDescription: {
        color: '#ccc',
        fontSize: 14,
        marginLeft: 30,
    },
    cancelButton: {
        marginTop: 10,
        paddingVertical: 12,
        borderRadius: 8,
        backgroundColor: '#ff2d55',
        alignItems: 'center',
    },
    cancelButtonText: {
        color: 'white',
        fontWeight: 'bold',
    },
});
