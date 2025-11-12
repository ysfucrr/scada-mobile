import React, { useState, useEffect } from 'react';
import {
  Alert,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ScrollView,
} from 'react-native';
import { useWebSocket } from '../context/WebSocketContext';
import { RegisterData } from '../services/ApiService';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface WriteRegisterModalProps {
  visible: boolean;
  register: RegisterData | null;
  onClose: () => void;
}

export default function WriteRegisterModal({ visible, register, onClose }: WriteRegisterModalProps) {
  const [value, setValue] = useState('');
  const [selectedOption, setSelectedOption] = useState<{label: string, value: number | string} | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isWriting, setIsWriting] = useState(false);
  const { writeRegister } = useWebSocket();

  const isDropdown = register?.controlType === 'dropdown' && register?.dropdownOptions && register.dropdownOptions.length > 0;
  const isButton = register?.controlType === 'button';
  const [selectedButton, setSelectedButton] = useState<'on' | 'off' | null>(null);

  // Modal açıldığında state'i sıfırla
  useEffect(() => {
    if (visible) {
      setValue('');
      setSelectedOption(null);
      setShowDropdown(false);
      setSelectedButton(null);
    }
  }, [visible]);

  const handleWrite = async () => {
    if (!register) {
      Alert.alert('Error', 'Register not found');
      return;
    }

    let writeValue: number;

    if (isDropdown) {
      if (!selectedOption) {
        Alert.alert('Error', 'Please select a value');
        return;
      }
      writeValue = typeof selectedOption.value === 'number' ? selectedOption.value : parseFloat(selectedOption.value.toString());
      if (isNaN(writeValue)) {
        Alert.alert('Error', 'Invalid value selected');
        return;
      }
    } else if (isButton) {
      if (!selectedButton) {
        Alert.alert('Error', 'Please select ON or OFF state');
        return;
      }
      const buttonValue = selectedButton === 'on' ? register.onValue : register.offValue;
      if (buttonValue === undefined || buttonValue === null) {
        Alert.alert('Error', 'Button value not configured');
        return;
      }
      writeValue = typeof buttonValue === 'number' ? buttonValue : parseFloat(buttonValue.toString());
      if (isNaN(writeValue)) {
        Alert.alert('Error', 'Invalid button value');
        return;
      }
    } else {
      if (!value.trim()) {
        Alert.alert('Error', 'Please enter a valid value');
        return;
      }
      writeValue = parseFloat(value);
      if (isNaN(writeValue)) {
        Alert.alert('Error', 'Please enter a numeric value');
        return;
      }
    }

    try {
      setIsWriting(true);
      await writeRegister(register._id, writeValue);
      
      const successMessage = isDropdown 
        ? `Write command sent successfully!\nRegister: ${register.name}\nValue: ${selectedOption?.label}`
        : isButton
        ? `Write command sent successfully!\nRegister: ${register.name}\nState: ${selectedButton === 'on' ? 'ON' : 'OFF'}\nValue: ${writeValue}`
        : `Write command sent successfully!\nRegister: ${register.name}\nValue: ${writeValue}`;
      
      Alert.alert(
        'Success',
        successMessage,
        [
          {
            text: 'OK',
            onPress: () => {
              setValue('');
              setSelectedOption(null);
              setSelectedButton(null);
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
    setSelectedOption(null);
    setShowDropdown(false);
    setSelectedButton(null);
    onClose();
  };

  const handleSelectOption = (option: {label: string, value: number | string}) => {
    setSelectedOption(option);
    setShowDropdown(false);
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
              {register.unit && (
                <Text style={styles.registerDetails}>
                  Unit: {register.unit}
                </Text>
              )}
            </View>
          )}

          <View style={styles.inputContainer}>
            <Text style={styles.label}>New Value:</Text>
            {isDropdown ? (
              <View>
                <TouchableOpacity
                  style={styles.dropdownButton}
                  onPress={() => setShowDropdown(!showDropdown)}
                  disabled={isWriting}
                >
                  <Text style={[styles.dropdownButtonText, !selectedOption && styles.placeholderText]}>
                    {selectedOption ? selectedOption.label : 'Select a value...'}
                  </Text>
                  <MaterialCommunityIcons
                    name={showDropdown ? "chevron-up" : "chevron-down"}
                    size={20}
                    color="#7f8c8d"
                  />
                </TouchableOpacity>
                {showDropdown && (
                  <View style={styles.dropdownList}>
                    <ScrollView style={styles.dropdownScrollView} nestedScrollEnabled={true}>
                      {register.dropdownOptions?.map((option, index) => (
                        <TouchableOpacity
                          key={index}
                          style={[
                            styles.dropdownItem,
                            selectedOption?.value === option.value && styles.dropdownItemSelected
                          ]}
                          onPress={() => handleSelectOption(option)}
                        >
                          <Text style={[
                            styles.dropdownItemText,
                            selectedOption?.value === option.value && styles.dropdownItemTextSelected
                          ]}>
                            {option.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>
            ) : isButton ? (
              <View style={styles.stateButtonContainer}>
                <TouchableOpacity
                  style={[
                    styles.stateButton,
                    selectedButton === 'on' && styles.stateButtonSelected,
                    selectedButton === 'on' && styles.stateButtonOn
                  ]}
                  onPress={() => setSelectedButton('on')}
                  disabled={isWriting}
                >
                  <Text style={[
                    styles.stateButtonText,
                    selectedButton === 'on' && styles.stateButtonTextSelected
                  ]}>
                    ON state
                  </Text>
                  <Text style={styles.stateButtonValue}>
                    {register.onValue !== undefined && register.onValue !== null ? register.onValue : 'N/A'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.stateButton,
                    selectedButton === 'off' && styles.stateButtonSelected,
                    selectedButton === 'off' && styles.stateButtonOff
                  ]}
                  onPress={() => setSelectedButton('off')}
                  disabled={isWriting}
                >
                  <Text style={[
                    styles.stateButtonText,
                    selectedButton === 'off' && styles.stateButtonTextSelected
                  ]}>
                   OFF state
                  </Text>
                  <Text style={styles.stateButtonValue}>
                    {register.offValue !== undefined && register.offValue !== null ? register.offValue : 'N/A'}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TextInput
                style={styles.input}
                value={value}
                onChangeText={setValue}
                placeholder="Enter numeric value"
                keyboardType="numeric"
                editable={!isWriting}
              />
            )}
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
  stateButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 15,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 15,
  },
  stateButton: {
    flex: 1,
    borderWidth: 2,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  stateButtonSelected: {
    borderWidth: 2,
  },
  stateButtonOn: {
    borderColor: '#4CAF50',
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
  },
  stateButtonOff: {
    borderColor: '#F44336',
    backgroundColor: 'rgba(244, 67, 54, 0.1)',
  },
  stateButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2c3e50',
    marginBottom: 8,
  },
  stateButtonTextSelected: {
    color: '#1976d2',
  },
  stateButtonValue: {
    fontSize: 14,
    color: '#7f8c8d',
    fontWeight: '500',
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
  dropdownButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 15,
    backgroundColor: '#fff',
  },
  dropdownButtonText: {
    fontSize: 16,
    color: '#2c3e50',
    flex: 1,
  },
  placeholderText: {
    color: '#95a5a6',
  },
  dropdownList: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fff',
    maxHeight: 200,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  dropdownScrollView: {
    maxHeight: 200,
  },
  dropdownItem: {
    padding: 15,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#eee',
  },
  dropdownItemSelected: {
    backgroundColor: '#e3f2fd',
  },
  dropdownItemText: {
    fontSize: 16,
    color: '#2c3e50',
  },
  dropdownItemTextSelected: {
    color: '#1976d2',
    fontWeight: '600',
  },
});