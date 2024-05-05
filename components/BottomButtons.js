import React, { useState } from 'react';
import { View, Image, TouchableOpacity } from 'react-native';
import globalStyles from '../styles/globalStyles';
import { bottomBarGradient, homeFeedIconGradient, homeFeedIcon, exploreIconGradient, exploreIcon, postButtonIcon, workoutsIconGradient, workoutsIcon, profileIconGradient, profileIcon } from '../assets/images';

export function BottomButtons() {
    const [selectedTab, setSelectedTab] = useState('App');
    return (
      <View style={{...globalStyles.bottomButtonContainer, height: 75, flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center'}}>
        <Image source={bottomBarGradient} style={{position: 'absolute', height: '100%', width: '95%'}}/>
        <TouchableOpacity style={globalStyles.button} onPress={() => setSelectedTab('HomeFeed')}>
          <Image source={selectedTab === 'HomeFeed' ? homeFeedIconGradient : homeFeedIcon} style={{ width: 40, height: 37, borderRadius:5 }} />
        </TouchableOpacity>
        <TouchableOpacity style={globalStyles.button} onPress={() => setSelectedTab('Explore')}>
          <Image source={selectedTab === 'Explore' ? exploreIconGradient : exploreIcon} style={{ width: 42, height: 42, borderRadius:5 }} />
        </TouchableOpacity>
        <TouchableOpacity style={globalStyles.button} onPress={() => setSelectedTab('Post')}>
          <Image source={postButtonIcon} style={{ width: 40, height: 40, borderRadius:5 }} />
        </TouchableOpacity>
        <TouchableOpacity style={globalStyles.button} onPress={() => setSelectedTab('Workouts')}>
          <Image source={selectedTab === 'Workouts' ? workoutsIconGradient : workoutsIcon} style={{ width: 40, height: 40, borderRadius:5 }} />
        </TouchableOpacity>
        <TouchableOpacity style={globalStyles.button} onPress={() => setSelectedTab('Profile')}>
          <Image source={selectedTab === 'Profile' ? profileIconGradient : profileIcon} style={{ width: 52, height: 45, borderRadius:5 }} />
        </TouchableOpacity>
      </View>
    );
  }
  