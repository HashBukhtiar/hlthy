import React, { useRef, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, PanResponder, Animated, Image } from 'react-native';
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
    variant?: 'default' | 'fullWidth';
}

export const CustomSelector = ({
    items,
    value,
    onSelect,
    placeholder = "Select option",
    title,
    icon = "options",
    modalVisible,
    setModalVisible,
    variant = 'default'
}: CustomSelectorProps) => {
    const selectedItem = items.find(item => item.value === value);
    const [tempValue, setTempValue] = useState<string | null>(value);
    const translateY = useRef(new Animated.Value(0)).current;
    const offsetY = useRef(0);

    const panResponder = useRef(
        PanResponder.create({
            onMoveShouldSetPanResponder: (evt, gestureState) => {
                return Math.abs(gestureState.dy) > 3;
            },
            onPanResponderGrant: () => {
                // Stop any ongoing animation and remember current position
                translateY.stopAnimation((value) => {
                    offsetY.current = value;
                });
            },
            onPanResponderMove: (evt, gestureState) => {
                // Calculate new position from the starting offset
                const newValue = offsetY.current + gestureState.dy;
                
                if (newValue >= 0) {
                    // Moving down - allow full movement
                    translateY.setValue(newValue);
                } else {
                    // Moving up - allow limited movement with resistance
                    const resistanceFactor = 0.2;
                    translateY.setValue(newValue * resistanceFactor);
                }
            },
            onPanResponderRelease: (evt, gestureState) => {
                const threshold = 80; // Lower threshold for easier dismissal
                const velocityThreshold = 0.5;
                
                if (gestureState.dy > threshold || gestureState.vy > velocityThreshold) {
                    // Dismiss modal with smooth animation
                    Animated.timing(translateY, {
                        toValue: 400,
                        duration: 250,
                        useNativeDriver: true,
                    }).start(() => {
                        setModalVisible(false);
                    });
                } else {
                    // Snap back to original position with spring animation
                    Animated.spring(translateY, {
                        toValue: 0,
                        tension: 120,
                        friction: 8,
                        useNativeDriver: true,
                    }).start();
                }
            },
        })
    ).current;

    // Reset animation when modal opens and sync tempValue with actual value
    useEffect(() => {
        if (modalVisible) {
            // Reset position smoothly when modal opens
            translateY.setValue(0);
            offsetY.current = 0;
            setTempValue(value);
        } else {
            // Ensure clean state when modal closes
            translateY.setValue(0);
            offsetY.current = 0;
        }
    }, [modalVisible, value]);

    return (
        <>
            {variant === 'fullWidth' ? (
                <TouchableOpacity 
                    style={styles.fullWidthSelector}
                    onPress={() => setModalVisible(true)}
                >
                    <View style={styles.fullWidthLabelContainer}>
                        <Ionicons name={icon as any} size={18} color="#ccc" />
                        <Text style={styles.fullWidthLabel}>{title}</Text>
                    </View>
                    <View style={styles.fullWidthValueContainer}>
                        <View style={styles.fullWidthValue}>
                            {selectedItem?.image ? (
                                <Image 
                                    source={selectedItem.image} 
                                    style={styles.selectedItemImage}
                                />
                            ) : selectedItem?.icon ? (
                                <Ionicons 
                                    name={selectedItem.icon as any} 
                                    size={16} 
                                    color="#FFF" 
                                />
                            ) : null}
                            <Text style={styles.fullWidthValueText}>
                                {selectedItem ? selectedItem.label : placeholder}
                            </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={16} color="#999" />
                    </View>
                </TouchableOpacity>
            ) : (
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
                            {selectedItem?.image ? (
                                <Image 
                                    source={selectedItem.image} 
                                    style={styles.selectedItemImage}
                                />
                            ) : selectedItem?.icon ? (
                                <Ionicons 
                                    name={selectedItem.icon as any} 
                                    size={18} 
                                    color="#FFF" 
                                />
                            ) : null}
                            <Text style={styles.selectedValueText}>
                                {selectedItem ? selectedItem.label : placeholder}
                            </Text>
                        </View>
                        <Ionicons name="chevron-down" size={18} color="#999" />
                    </TouchableOpacity>
                </View>
            )}

            <Modal
                animationType="slide"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <TouchableOpacity 
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => {
                        // Animate out smoothly when tapping overlay
                        Animated.timing(translateY, {
                            toValue: 400,
                            duration: 200,
                            useNativeDriver: true,
                        }).start(() => {
                            setModalVisible(false);
                        });
                    }}
                >
                    <Animated.View 
                        style={[
                            styles.modalContent,
                            {
                                transform: [{ translateY: translateY }]
                            }
                        ]}
                        {...panResponder.panHandlers}
                    >
                        {/* Dismissal Handle Bar */}
                        <View style={styles.handleBarContainer}>
                            <View style={styles.handleBar} />
                        </View>
                        
                        <Text style={styles.modalTitle}>Select {title}</Text>
                        
                        {items.map((item) => (
                            <TouchableOpacity
                                key={item.value}
                                style={[
                                    styles.modalOption,
                                    tempValue === item.value && styles.selectedOption
                                ]}
                                onPress={() => {
                                    setTempValue(item.value);
                                }}
                            >
                                <View style={styles.optionHeader}>
                                    {item.image ? (
                                        <Image 
                                            source={item.image} 
                                            style={[
                                                styles.optionImage,
                                                { tintColor: tempValue === item.value ? "#ff2d55" : "#FFF" }
                                            ]}
                                        />
                                    ) : item.icon ? (
                                        <Ionicons 
                                            name={item.icon as any} 
                                            size={20} 
                                            color={tempValue === item.value ? "#ff2d55" : "#FFF"} 
                                        />
                                    ) : null}
                                    <Text style={[
                                        styles.optionLabel,
                                        tempValue === item.value && styles.selectedOptionText
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
                            style={[
                                styles.cancelButton,
                                tempValue && styles.saveButton
                            ]}
                            onPress={() => {
                                if (tempValue) {
                                    // Save the selection
                                    onSelect(tempValue);
                                }
                                setModalVisible(false);
                            }}
                        >
                            <Text style={[
                                styles.cancelButtonText,
                                tempValue && styles.saveButtonText
                            ]}>
                                {tempValue ? "Save" : "Cancel"}
                            </Text>
                        </TouchableOpacity>
                    </Animated.View>
                </TouchableOpacity>
            </Modal>
        </>
    );
};

const styles = StyleSheet.create({
    selectorContainer: {
        width: '100%',
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
        justifyContent: 'space-between',
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        borderRadius: 12,
        padding: 14,
        paddingHorizontal: 16,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.12)',
        flex: 1,
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
    // Image styles
    selectedItemImage: {
        width: 18,
        height: 18,
        tintColor: '#FFF',
    },
    optionImage: {
        width: 20,
        height: 20,
        tintColor: '#FFF',
    },
    // Full width variant styles
    fullWidthSelector: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    fullWidthLabelContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    fullWidthLabel: {
        fontSize: 16,
        color: '#FFF',
        marginLeft: 8,
    },
    fullWidthValueContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    fullWidthValue: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 8,
    },
    fullWidthValueText: {
        fontSize: 14,
        color: '#ccc',
        marginLeft: 6,
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
        paddingTop: 8,
        paddingHorizontal: 24,
        paddingBottom: 24,
        maxHeight: '92%',
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
        color: '#fff',
    },
    optionDescription: {
        color: '#ccc',
        fontSize: 14,
        marginLeft: 30,
    },
    cancelButton: {
        marginTop: 10,
        marginBottom: 20,
        paddingVertical: 12,
        borderRadius: 8,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)',
    },
    saveButton: {
        backgroundColor: '#ff2d55',
        borderColor: '#ff2d55',
    },
    cancelButtonText: {
        color: '#FFF',
        fontWeight: 'bold',
    },
    saveButtonText: {
        color: 'white',
    },
    handleBarContainer: {
        alignItems: 'center',
        paddingTop: 8,
        paddingBottom: 16,
    },
    handleBar: {
        width: 40,
        height: 4,
        backgroundColor: '#999',
        borderRadius: 2,
        opacity: 0.8,
    },
});
