import { StyleSheet } from 'react-native';

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
    marginBottom: 0,
    borderTopColor: 'red',
    borderWidth: 1,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'black',
    paddingVertical: 10,
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
    width: 50, 
    height: 50, 
    borderRadius: 25, 
    backgroundColor: 'pink', 
    justifyContent: 'center', 
    alignItems: 'center',
    paddingBottom: 5,
    marginTop: 5
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
  }
});

export default globalStyles;