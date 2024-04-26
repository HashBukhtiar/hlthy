import { 
    StyleSheet,
    View,
    Text,
    TouchableOpacity
 } from 'react-native';
import globalStyles from '../styles/globalStyles';

 export default function Activity() {
    return (
        <View style={globalStyles.background}>
            <View style={activityStyles.tabHeaderButtonsContainer}>
                <TouchableOpacity style={activityStyles.tabHeaderButton} onPress={() => {console.log("Activity pressed")}}>
                    <Text style={activityStyles.tabHeader}>Activity</Text>
                </TouchableOpacity>
                <TouchableOpacity style={activityStyles.tabHeaderButton} onPress={() => {console.log("Milestones pressed")}}>
                    <Text style={activityStyles.tabHeader}>Milestones</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const activityStyles = StyleSheet.create({
    tabHeaderButtonsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        padding: 10,
        borderWidth: 1,
        borderColor: 'white'
    },
    tabHeaderButton: {
        padding: 5,
        borderRadius: 5,
        margin: 5,
        justifyContent: 'center',
        alignItems: 'center',
    },
    tabHeader: {
        fontSize: 30,
        color: 'white',
        fontFamily: 'System',
        paddingHorizontal: 10,
    },
});