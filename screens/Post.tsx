import React, { useState } from 'react';
import { 
    View, 
    TouchableOpacity, 
    Text,
    StyleSheet,
    SafeAreaView
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import RegularPost from './RegularPost';
import MilestoneOnlyPost from './MilestoneOnlyPost';
import MilestoneWithPost from './MilestoneWithPost';
import { SECONDARY_COLOR } from './PostComponents';

export default function Post() {
    // Initial state is null, so we show the selection screen first
    const [postType, setPostType] = useState<'regular' | 'milestoneOnly' | 'milestoneWithPost' | null>(null);

    // Render content based on selected post type
    const renderContent = () => {
        switch (postType) {
            case 'regular':
                return <RegularPost />;
            case 'milestoneOnly':
                return <MilestoneOnlyPost />;
            case 'milestoneWithPost':
                return <MilestoneWithPost />;
            default:
                // If no post type selected, show selection screen
                return renderSelectionScreen();
        }
    };

    // Selection screen UI
    const renderSelectionScreen = () => (
        <SafeAreaView style={styles.container}>
            <View style={styles.postSelectionPage}>
                <Text style={styles.headerTitle}>Create New</Text>
                
                <View style={styles.postTypeGrid}>
                    {/* Regular Post Option */}
                    <TouchableOpacity
                        style={styles.postTypeCard}
                        onPress={() => setPostType('regular')}
                    >
                        <View style={styles.postTypeIconContainer}>
                            <Ionicons name="images" size={32} color="#FFF" />
                        </View>
                        <Text style={styles.postTypeTitle}>Regular Post</Text>
                        <Text style={styles.postTypeDescription}>
                            Share photos, videos, and thoughts with your followers
                        </Text>
                        <View style={styles.arrowContainer}>
                            <Ionicons name="arrow-forward-circle" size={28} color={SECONDARY_COLOR} />
                        </View>
                    </TouchableOpacity>

                    {/* Milestone Only Option */}
                    <TouchableOpacity
                        style={styles.postTypeCard}
                        onPress={() => setPostType('milestoneOnly')}
                    >
                        <View style={styles.postTypeIconContainer}>
                            <MaterialCommunityIcons name="trophy" size={32} color="#FFF" />
                        </View>
                        <Text style={styles.postTypeTitle}>Milestone Only</Text>
                        <Text style={styles.postTypeDescription}>
                            Track and share personal records and achievements
                        </Text>
                        <View style={styles.arrowContainer}>
                            <Ionicons name="arrow-forward-circle" size={28} color={SECONDARY_COLOR} />
                        </View>
                    </TouchableOpacity>

                    {/* Milestone with Post Option */}
                    <TouchableOpacity
                        style={styles.postTypeCard}
                        onPress={() => setPostType('milestoneWithPost')}
                    >
                        <View style={styles.postTypeIconContainer}>
                            <View style={styles.combinedIcon}>
                                <MaterialCommunityIcons name="trophy" size={24} color="#FFF" />
                                <Ionicons name="images" size={24} color="#FFF" style={styles.overlappingIcon} />
                            </View>
                        </View>
                        <Text style={styles.postTypeTitle}>Achievement Post</Text>
                        <Text style={styles.postTypeDescription}>
                            Share achievements with photos and personal stories
                        </Text>
                        <View style={styles.arrowContainer}>
                            <Ionicons name="arrow-forward-circle" size={28} color={SECONDARY_COLOR} />
                        </View>
                    </TouchableOpacity>
                </View>
            </View>
        </SafeAreaView>
    );

    // Main render
    return renderContent();
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    postSelectionPage: {
        flex: 1,
        backgroundColor: '#000',
        padding: 16,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#FFF',
        marginBottom: 24,
        marginTop: 12,
    },
    postTypeGrid: {
        flex: 1,
    },
    postTypeCard: {
        backgroundColor: '#111',
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#222',
        position: 'relative',
    },
    postTypeIconContainer: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: SECONDARY_COLOR,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    postTypeTitle: {
        color: '#FFF',
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    postTypeDescription: {
        color: '#AAA',
        fontSize: 14,
        lineHeight: 20,
        marginRight: 40,
    },
    arrowContainer: {
        position: 'absolute',
        bottom: 20,
        right: 20,
    },
    combinedIcon: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    overlappingIcon: {
        marginLeft: -8,
    },
});