import { useRef } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { theme } from 'theme';

export type ConfirmType = 'default' | 'primary' | 'danger';

export interface ConfirmModalProps {
  visible: boolean;
  title?: string;
  message?: string;
  type?: ConfirmType;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({
  visible,
  title = '提示',
  message = '',
  type = 'primary',
  confirmText = '确定',
  cancelText = '取消',
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  // 用 ref 保存最新的确认回调，避免闭包问题
  const confirmRef = useRef(onConfirm);
  confirmRef.current = onConfirm;

  const handleConfirm = () => {
    onCancel(); // 先关闭弹窗
    confirmRef.current?.();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType='fade'
      onRequestClose={onCancel}
    >
      <TouchableOpacity
        style={styles.mask}
        activeOpacity={1}
        onPress={onCancel}
      >
        <TouchableOpacity style={styles.content} activeOpacity={1}>
          <Text style={styles.title}>{title}</Text>
          {message ? <Text style={styles.message}>{message}</Text> : null}
          <View style={styles.actions}>
            <TouchableOpacity style={styles.btnCancel} onPress={onCancel}>
              <Text style={styles.btnCancelText}>{cancelText}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.btnConfirm,
                type === 'danger' && styles.btnDanger,
                type === 'default' && styles.btnDefault,
              ]}
              onPress={handleConfirm}
            >
              <Text style={styles.btnConfirmText}>{confirmText}</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  mask: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  content: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text_default,
    textAlign: 'center',
    marginBottom: 10,
  },
  message: {
    fontSize: 14,
    color: theme.colors.text_secondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  btnCancel: {
    flex: 1,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.bg_gray,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnCancelText: {
    fontSize: 14,
    color: theme.colors.text_gray,
  },
  btnConfirm: {
    flex: 1,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.selected,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnDanger: {
    backgroundColor: '#ff4d4f',
  },
  btnDefault: {
    backgroundColor: theme.colors.text_gray,
  },
  btnConfirmText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#fff',
  },
});
