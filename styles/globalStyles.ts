import { StyleSheet, Dimensions } from 'react-native';

export const BOTTOM_BAR_HEIGHT = 60;

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
    paddingBottom: BOTTOM_BAR_HEIGHT + 20,
  } // contentContainer obj still being used ? maybe delete
});

export default globalStyles;