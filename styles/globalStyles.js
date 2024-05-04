import { StyleSheet } from 'react-native';


export default StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    fontFamily: 'comfortaa',
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
    marginBottom: 5,
    borderWidth: 0
  },
  button: {
    padding: 10,
    borderRadius: 5,
  },
  buttonText: {
    color: 'white',
  },
});