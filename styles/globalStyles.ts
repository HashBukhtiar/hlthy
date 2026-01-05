import { StyleSheet, Dimensions, Platform } from 'react-native';

// Legacy bottom bar height (kept for backward compatibility)
export const BOTTOM_BAR_HEIGHT = 60;

// Native tab bar height (approximation for proper spacing)
// iOS native tab bar is ~49pt base + safe area bottom
// Android Material bottom nav is ~56dp
export const NATIVE_TAB_BAR_HEIGHT = Platform.select({
  ios: 83, // 49pt bar + ~34pt safe area (iPhone with notch)
  android: 72, // 56dp + some padding
  default: 80,
});

const globalStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 35,
    fontWeight: 'bold',
    fontFamily: 'System',
    color: 'white',
    paddingLeft: 10,
  },
  subtitle: {
    fontSize: 22,
    fontFamily: 'System',
    paddingLeft: 10,
    color: 'white',
  },
  caption: {
    paddingLeft: 10,
    fontSize: 18,
    fontFamily: 'System',
    color: 'white',
  },
  background: {
    backgroundColor: 'black',
    flex: 1
  },
  bottomButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopColor: '#666',
    borderWidth: 1,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'black',
    paddingTop: 5,
    paddingBottom: 10,
    height: BOTTOM_BAR_HEIGHT,
    zIndex: 1000
  },
  button: {
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: 'white',
  },
  postButton: {
    justifyContent: 'center', 
    alignItems: 'center',
  },
  backArrowIcon: {
    width: 30,
    height: 30,
    transform: [{ rotate: '180deg' }],
    tintColor: 'white',
  },
  horizontalLine: {
    borderBottomColor: 'white',
    borderBottomWidth: 2,
    marginTop: 10
  },
  contentContainer: {
    paddingBottom: NATIVE_TAB_BAR_HEIGHT + 10,
  }
});

export default globalStyles;