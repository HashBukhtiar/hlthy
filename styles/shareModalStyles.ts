import { StyleSheet } from 'react-native';

export const shareModalStyles = StyleSheet.create({
  shareModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  shareModalContent: {
    backgroundColor: '#121212',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 15,
    paddingTop: 15,
    paddingBottom: 30,
    maxHeight: '80%',
  },
  shareModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 15,
    borderBottomColor: '#333',
    borderBottomWidth: 1,
  },
  shareModalTitle: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  searchContainer: {
    flexDirection: 'row',
    marginVertical: 15,
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#333',
    color: '#FFF',
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomColor: '#333',
    borderBottomWidth: 1,
  },
  userItemImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 15,
  },
  userItemText: {
    color: '#FFF',
    fontSize: 16,
  },
  emptyResultsText: {
    color: '#888',
    textAlign: 'center',
    marginTop: 20,
  },
});