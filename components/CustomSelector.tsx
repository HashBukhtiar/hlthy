import React, { useRef, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, PanResponder, Animated, Image, Dimensions, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ACCENT_COLOR } from '@/constants/Colors';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const DRAG_THRESHOLD = 100;

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
    const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
    const opacity = useRef(new Animated.Value(0)).current;
    const optionScales = useRef(items.map(() => new Animated.Value(1))).current;
    const optionSelectionProgress = useRef(items.map(() => new Animated.Value(0))).current;

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: (_, gestureState) => {
                return Math.abs(gestureState.dy) > 5;
            },
            onPanResponderMove: (_, gestureState) => {
                if (gestureState.dy > 0) {
                    translateY.setValue(gestureState.dy);
                }
            },
            onPanResponderRelease: (_, gestureState) => {
                if (gestureState.dy > DRAG_THRESHOLD || gestureState.vy > 0.5) {
                    handleClose();
                } else {
                    Animated.spring(translateY, {
                        toValue: 0,
                        useNativeDriver: true,
                        tension: 100,
                        friction: 15,
                    }).start();
                }
            },
        })
    ).current;

    const handleClose = () => {
        Animated.parallel([
            Animated.timing(translateY, {
                toValue: SCREEN_HEIGHT,
                duration: 280,
                useNativeDriver: true,
            }),
            Animated.timing(opacity, {
                toValue: 0,
                duration: 240,
                useNativeDriver: true,
            }),
        ]).start(() => {
            setModalVisible(false);
        });
    };

    const handleOptionSelect = (itemValue: string, index: number) => {
        // Animate the selected option with subtle scale
        Animated.sequence([
            Animated.timing(optionScales[index], {
                toValue: 0.98,
                duration: 120,
                useNativeDriver: true,
            }),
            Animated.spring(optionScales[index], {
                toValue: 1,
                tension: 200,
                friction: 12,
                useNativeDriver: true,
            }),
        ]).start();

        // Animate color transitions for all options
        items.forEach((_, idx) => {
            Animated.timing(optionSelectionProgress[idx], {
                toValue: idx === index ? 1 : 0,
                duration: 250,
                useNativeDriver: false,
            }).start();
        });

        setTempValue(itemValue);
    };

    const handleSave = () => {
        if (tempValue) {
            onSelect(tempValue);
        }
        handleClose();
    };

    useEffect(() => {
        if (modalVisible) {
            setTempValue(value);
            
            // Initialize selection animations
            items.forEach((item, idx) => {
                optionSelectionProgress[idx].setValue(item.value === value ? 1 : 0);
            });
            
            Animated.parallel([
                Animated.spring(translateY, {
                    toValue: 0,
                    useNativeDriver: true,
                    tension: 80,
                    friction: 14,
                }),
                Animated.timing(opacity, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true,
                }),
            ]).start();
        } else {
            translateY.setValue(SCREEN_HEIGHT);
            opacity.setValue(0);
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
                animationType="none"
                transparent={true}
                visible={modalVisible}
                onRequestClose={handleClose}
                statusBarTranslucent
            >
                <Animated.View style={[styles.modalOverlay, { opacity }]}>
                    <Pressable 
                        style={styles.overlayPressable}
                        onPress={handleClose}
                    />
                    <Animated.View 
                        style={[
                            styles.modalContent,
                            {
                                transform: [{ translateY }]
                            }
                        ]}
                    >
                        {/* Drag Handle */}
                        <View style={styles.handleBarContainer} {...panResponder.panHandlers}>
                            <View style={styles.handleBar} />
                        </View>
                        
                        <Text style={styles.modalTitle}>Select {title}</Text>
                        
                        {items.map((item, index) => {
                            const isSelected = tempValue === item.value;
                            
                            // Interpolate colors based on selection progress
                            const backgroundColor = optionSelectionProgress[index].interpolate({
                                inputRange: [0, 1],
                                outputRange: ['rgba(255, 255, 255, 0.06)', 'rgba(255, 45, 85, 0.12)'],
                            });
                            
                            const borderColor = optionSelectionProgress[index].interpolate({
                                inputRange: [0, 1],
                                outputRange: ['rgba(255, 255, 255, 0.1)', ACCENT_COLOR],
                            });
                            
                            return (
                                <Animated.View
                                    key={item.value}
                                    style={[
                                        styles.modalOption,
                                        {
                                            backgroundColor,
                                            borderColor,
                                            borderWidth: isSelected ? 2 : 1.5,
                                        }
                                    ]}
                                >
                                    <Animated.View
                                        style={{
                                            transform: [{ scale: optionScales[index] }],
                                        }}
                                    >
                                        <TouchableOpacity
                                            style={styles.optionTouchable}
                                            onPress={() => handleOptionSelect(item.value, index)}
                                            activeOpacity={0.8}
                                        >
                                            <View style={styles.optionHeader}>
                                                {item.image ? (
                                                    <Image 
                                                        source={item.image} 
                                                        style={[
                                                            styles.optionImage,
                                                            { tintColor: isSelected ? ACCENT_COLOR : "#FFF" }
                                                        ]}
                                                    />
                                                ) : item.icon ? (
                                                    <Ionicons 
                                                        name={item.icon as any} 
                                                        size={20} 
                                                        color={isSelected ? ACCENT_COLOR : "#FFF"} 
                                                    />
                                                ) : null}
                                                <Animated.Text style={[
                                                    styles.optionLabel,
                                                    isSelected && styles.selectedOptionText
                                                ]}>
                                                    {item.label}
                                                </Animated.Text>
                                                {/* checkmark removed - selection now highlights only */}
                                            </View>
                                            {item.description && (
                                                <Text style={styles.optionDescription}>
                                                    {item.description}
                                                </Text>
                                            )}
                                        </TouchableOpacity>
                                    </Animated.View>
                                </Animated.View>
                            );
                        })}
                        
                        <TouchableOpacity 
                            style={[
                                styles.saveButton,
                                !tempValue && styles.saveButtonDisabled
                            ]}
                            onPress={handleSave}
                            activeOpacity={0.8}
                            disabled={!tempValue}
                        >
                            <Text style={[
                                styles.saveButtonText,
                                !tempValue && styles.saveButtonTextDisabled
                            ]}>Save</Text>
                        </TouchableOpacity>
                    </Animated.View>
                </Animated.View>
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
        backgroundColor: 'rgba(0,0,0,0.75)',
        justifyContent: 'flex-end',
    },
    overlayPressable: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
    modalContent: {
        backgroundColor: '#1a1a1a',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingTop: 4,
        paddingHorizontal: 24,
        paddingBottom: 34,
        maxHeight: '92%',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#FFF',
        marginBottom: 20,
        textAlign: 'center',
        letterSpacing: -0.3,
    },
    modalOption: {
        marginBottom: 10,
        borderRadius: 14,
        overflow: 'hidden',
    },
    optionTouchable: {
        padding: 16,
    },
    selectedOption: {
        borderColor: ACCENT_COLOR,
        backgroundColor: 'rgba(255, 45, 85, 0.12)',
        borderWidth: 2,
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
        fontWeight: '500',
        flex: 1,
    },
    selectedOptionText: {
        fontWeight: '700',
        color: '#fff',
    },
    optionDescription: {
        color: 'rgba(255, 255, 255, 0.6)',
        fontSize: 13,
        marginLeft: 30,
        lineHeight: 18,
    },
    checkmarkContainer: {
        marginLeft: 'auto',
    },
    saveButton: {
        marginTop: 16,
        marginBottom: 8,
        paddingVertical: 16,
        borderRadius: 14,
        backgroundColor: ACCENT_COLOR,
        alignItems: 'center',
        justifyContent: 'center',
    },
    saveButtonDisabled: {
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        shadowOpacity: 0,
        elevation: 0,
    },
    saveButtonText: {
        color: '#FFF',
        fontWeight: '700',
        fontSize: 17,
        letterSpacing: 0.3,
    },
    saveButtonTextDisabled: {
        color: 'rgba(255, 255, 255, 0.3)',
        fontWeight: '600',
    },
    handleBarContainer: {
        alignItems: 'center',
        paddingTop: 12,
        paddingBottom: 20,
    },
    handleBar: {
        width: 36,
        height: 4,
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
        borderRadius: 2,
    },
});
