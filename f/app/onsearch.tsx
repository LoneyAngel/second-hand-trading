import { SafeAreaView } from 'react-native-safe-area-context';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
import { theme } from '../theme';
import SearchBar from '~/components/SearchBar';
import { router } from 'expo-router';
import { useState } from 'react';
import Entypo from '@expo/vector-icons/Entypo';

export default function OnSearch_Page() {
  const [keyword, setKeyword] = useState('');

  const handleSubmit = () => {
    if (keyword.trim()) {
      router.push({
        pathname: '/search',
        params: { keyword: keyword.trim() },
      });
    }
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={{ zIndex: 100, backgroundColor: 'white' }} edges={['top']}>
        <View style={styles.top_bar}>
          <TouchableOpacity
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            onPress={() => {
              router.back();
            }}
          >
            <Entypo name='chevron-left' size={24} color={theme.colors.text_default} />
          </TouchableOpacity>
          <SearchBar
            isSearchPage={true}
            value={keyword}
            onSearch={(text) => {
              setKeyword(text);
            }}
            onSubmit={handleSubmit}
          />
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bg_gray,
  },
  top_bar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    gap: 10,
  },
});
