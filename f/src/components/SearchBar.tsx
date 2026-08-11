import { StyleSheet, View, TextInput, Pressable } from 'react-native';
import { theme } from '../../theme';
import { router } from 'expo-router';
import Feather from '@expo/vector-icons/Feather';

interface SearchBarProps {
  placeholder?: string;
  isSearchPage?: boolean;
  onSearch?: (text: string) => void;
  onSubmit?: () => void;
  value?: string;
}

export default function SearchBar({
  placeholder = '搜索二手商品',
  isSearchPage = false,
  onSearch,
  onSubmit,
  value,
}: SearchBarProps) {
  return (
    <View style={styles.container}>
      {isSearchPage ? (
        // 搜索页面：显示可输入的 TextInput
        <View style={styles.searchBox}>
          <Feather name='search' size={20} color={theme.colors.text_secondary} />
          <TextInput
            style={styles.input}
            placeholder={placeholder}
            placeholderTextColor={theme.colors.text_secondary}
            autoFocus
            value={value}
            onChangeText={onSearch}
            onSubmitEditing={onSubmit}
            returnKeyType='search'
          />
        </View>
      ) : (
        // 其他页面：可点击跳转到搜索页面
        <Pressable
          style={styles.searchBox}
          onPress={() => {
            router.push({
              pathname: '/onsearch',
            });
          }}
        >
          <Feather name='search' size={20} color={theme.colors.text_secondary} />
          <TextInput
            style={styles.input}
            placeholder={placeholder}
            placeholderTextColor={theme.colors.text_secondary}
            editable={false}
            pointerEvents='none'
          />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: theme.radii.lg,
    borderColor: 'rgb(202, 202, 202)',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    height: 40,
  },
  input: {
    flex: 1,
    marginLeft: theme.spacing.sm,
    fontSize: theme.fontSizes.lg,
    paddingVertical: 0,
    lineHeight: theme.fontSizes.lg + 8,
    color: theme.colors.text_default,
  },
});
