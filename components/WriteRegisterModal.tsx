import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { RegisterData } from '../services/ApiService';
import { useWebSocket } from '../context/WebSocketContext';

interface WriteRegisterModalProps {
  visible: boolean;
  register: RegisterData | null;
  onClose: () => void;
}

export default function WriteRegisterModal({ visible, register, onClose }: WriteRegisterModalProps) {
  const [value, setValue] = useState('');
  const [isWriting, setIsWriting] = useState(false);
  const { writeRegister } = useWebSocket();

  const handleWrite = async () => {
    if (!register || !value.trim()) {
      Alert.alert('Error', 'Please enter a valid value');
      return;
    }

    try {
      setIsWriting(true);
      const numericValue = parseFloat(value);
      
      if (isNaN(numericValue)) {
        Alert.alert('Error', 'Please enter a numeric value');
        return;
      }

      await writeRegister(register._id, numericValue);
      
      Alert.alert(
        'Success',
        `Write command sent successfully!\nRegister: ${register.name}\nValue: ${numericValue}`,
        [
          {
            text: 'OK',
            onPress: () => {
              setValue('');
              onClose();
            }
          }
        ]
      );
    } catch (error) {
      console.error('Write error:', error);
      Alert.alert(
        'Write Failed',
        error instanceof Error ? error.message : 'Unknown error occurred'
      );
    } finally {
      setIsWriting(false);
    }
  };

  const handleClose = () => {
    setValue('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <View style={styles.header}>
            <Text style={styles.title}>Write Register</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>×</Text>
            </TouchableOpacity>
          </View>

          {register && (
            <View style={styles.registerInfo}>
              <Text style={styles.registerName}>{register.name}</Text>
              <Text style={styles.registerDetails}>
                Analyzer: {register.analyzerName || register.analyzerId} | Address: {register.address}
              </Text>
              <Text style={styles.registerDetails}>
                Type: {register.dataType} | Unit: {register.unit || 'N/A'}
              </Text>
            </View>
          )}

          <View style={styles.inputContainer}>
            <Text style={styles.label}>New Value:</Text>
            <TextInput
              style={styles.input}
              value={value}
              onChangeText={setValue}
              placeholder="Enter numeric value"
              keyboardType="numeric"
              editable={!isWriting}
            />
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.cancelButton]}
              onPress={handleClose}
              disabled={isWriting}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.writeButton, isWriting && styles.disabledButton]}
              onPress={handleWrite}
              disabled={isWriting}
            >
              <Text style={styles.writeButtonText}>
                {isWriting ? 'Writing...' : 'Write'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    margin: 20,
    minWidth: 300,
    maxWidth: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#ecf0f1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 20,
    color: '#7f8c8d',
    fontWeight: 'bold',
  },
  registerInfo: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 15,
    marginBottom: 20,
  },
  registerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 5,
  },
  registerDetails: {
    fontSize: 12,
    color: '#7f8c8d',
    marginBottom: 2,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#34495e',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 15,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#95a5a6',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  writeButton: {
    flex: 1,
    backgroundColor: '#e74c3c',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
  },
  writeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    backgroundColor: '#bdc3c7',
  },
});