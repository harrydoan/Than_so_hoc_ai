import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Modal,
  FlatList,
  Alert,
} from 'react-native';

const API_URL = 'https://numerology-api-bu2r.vercel.app/api/analyze'; // URL mới

// Danh sách models
const AI_MODELS = [
  { id: 'openai/gpt-3.5-turbo', name: 'GPT-3.5', free: false, default: true },
  { id: 'openai/gpt-4o-mini', name: 'GPT-4o mini', free: false },
  { id: 'anthropic/claude-3-haiku-20240307', name: 'Claude 3 Haiku', free: true },
  { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet', free: false },
  { id: 'deepseek/deepseek-r1:free', name: 'DeepSeek R1', free: true },
  { id: 'google/gemini-2.0-flash-exp:free', name: 'Gemini 2.0 Flash', free: true },
  { id: 'google/gemini-2.0-flash-thinking-exp:free', name: 'Gemini 2.0 Pro', free: false },
];

export default function App() {
  const [formData, setFormData] = useState({
    fullName: '',
    birthDate: '',
    licensePlate: '',
    phoneNumber: '',
  });
  const [selectedModels, setSelectedModels] = useState(['openai/gpt-4o-mini']);
  const [showModelPicker, setShowModelPicker] = useState(false);
  const [results, setResults] = useState({});
  const [loading, setLoading] = useState(false);
  const [compareMode, setCompareMode] = useState(false);

  // Tính con số thần số học
  const calculateNumerology = (text) => {
    if (!text) return 0;
    
    let sum = 0;
    for (let char of text) {
      if (char >= '0' && char <= '9') {
        sum += parseInt(char);
      } else if (char.match(/[a-zA-Z]/i)) {
        const charCode = char.toUpperCase().charCodeAt(0) - 64;
        sum += charCode;
      }
    }
    
    while (sum > 9 && sum !== 11 && sum !== 22 && sum !== 33) {
      sum = sum.toString().split('').reduce((a, b) => a + parseInt(b), 0);
    }
    
    return sum;
  };

  // Toggle model selection
  const toggleModel = (modelId) => {
    if (compareMode) {
      if (selectedModels.includes(modelId)) {
        setSelectedModels(selectedModels.filter(id => id !== modelId));
      } else if (selectedModels.length < 3) {
        setSelectedModels([...selectedModels, modelId]);
      } else {
        Alert.alert('Giới hạn', 'Chỉ có thể chọn tối đa 3 model để so sánh');
      }
    } else {
      setSelectedModels([modelId]);
    }
  };

  // Kiểm tra model trả phí
  const checkPaidModels = () => {
    const paidModels = selectedModels.filter(modelId => {
      const model = AI_MODELS.find(m => m.id === modelId);
      return model && !model.free;
    });

    if (paidModels.length > 0) {
      const modelNames = paidModels.map(id => 
        AI_MODELS.find(m => m.id === id)?.name
      ).join(', ');
      
      return new Promise((resolve) => {
        Alert.alert(
          'Model trả phí',
          `Bạn đã chọn model trả phí: ${modelNames}. Tiếp tục?`,
          [
            { text: 'Hủy', onPress: () => resolve(false) },
            { text: 'Tiếp tục', onPress: () => resolve(true) }
          ]
        );
      });
    }
    return Promise.resolve(true);
  };

  // Xử lý phân tích (GỘP 1 LẦN GỌI)
  const handleAnalyze = async () => {
    const hasData = Object.values(formData).some(value => value.trim() !== '');
    if (!hasData) {
      Alert.alert('Thông báo', 'Vui lòng điền ít nhất một thông tin để phân tích');
      return;
    }

    const shouldContinue = await checkPaidModels();
    if (!shouldContinue) return;
    
    setLoading(true);
    setResults({});
    
    // Chuẩn bị dữ liệu với số thần số học
    const numerologyData = {
      fullName: formData.fullName ? {
        text: formData.fullName,
        number: calculateNumerology(formData.fullName)
      } : null,
      birthDate: formData.birthDate ? {
        text: formData.birthDate,
        number: calculateNumerology(formData.birthDate)
      } : null,
      licensePlate: formData.licensePlate ? {
        text: formData.licensePlate,
        number: calculateNumerology(formData.licensePlate)
      } : null,
      phoneNumber: formData.phoneNumber ? {
        text: formData.phoneNumber,
        number: calculateNumerology(formData.phoneNumber)
      } : null,
    };
    
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: numerologyData,
          models: selectedModels
        }),
      });
      
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      
      const result = await response.json();
      setResults(result);
      
    } catch (error) {
      console.error('Error:', error);
      Alert.alert('Lỗi', 'Không thể kết nối máy chủ. Vui lòng thử lại sau.');
    }
    
    setLoading(false);
  };

  // Render model picker
  const renderModelPicker = () => (
    <Modal
      visible={showModelPicker}
      animationType="slide"
      transparent={true}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Chọn AI Model</Text>
          
          <View style={styles.modeToggle}>
            <TouchableOpacity
              style={[styles.modeButton, !compareMode && styles.modeButtonActive]}
              onPress={() => {
                setCompareMode(false);
                setSelectedModels(selectedModels.slice(0, 1));
              }}
            >
              <Text style={[styles.modeButtonText, !compareMode && styles.modeButtonTextActive]}>
                Một model
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modeButton, compareMode && styles.modeButtonActive]}
              onPress={() => setCompareMode(true)}
            >
              <Text style={[styles.modeButtonText, compareMode && styles.modeButtonTextActive]}>
                So sánh (max 3)
              </Text>
            </TouchableOpacity>
          </View>
          
          <FlatList
            data={AI_MODELS}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.modelItem,
                  selectedModels.includes(item.id) && styles.modelItemSelected
                ]}
                onPress={() => toggleModel(item.id)}
              >
                <View style={styles.modelInfo}>
                  <Text style={styles.modelName}>{item.name}</Text>
                  {item.free && <Text style={styles.freeTag}>FREE</Text>}
                  {item.default && <Text style={styles.defaultTag}>Mặc định</Text>}
                </View>
                {selectedModels.includes(item.id) && (
                  <Text style={styles.checkmark}>✓</Text>
                )}
              </TouchableOpacity>
            )}
          />
          
          <TouchableOpacity
            style={styles.modalButton}
            onPress={() => setShowModelPicker(false)}
          >
            <Text style={styles.modalButtonText}>Xong</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  // Render kết quả
  const renderResults = () => {
    if (!results.results) return null;
    
    return (
      <View style={styles.resultsContainer}>
        <Text style={styles.resultsTitle}>📊 Kết quả phân tích tổng hợp</Text>
        
        {compareMode ? (
          // So sánh nhiều model
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {results.results.map((modelResult, index) => (
              <View key={index} style={styles.modelResultColumn}>
                <Text style={styles.modelResultTitle}>
                  {AI_MODELS.find(m => m.id === modelResult.model)?.name}
                </Text>
                <ScrollView>
                  <View style={styles.resultCard}>
                    <Text style={styles.analysisText}>{modelResult.analysis}</Text>
                  </View>
                </ScrollView>
              </View>
            ))}
          </ScrollView>
        ) : (
          // Một model
          <View style={styles.resultCard}>
            <Text style={styles.analysisText}>{results.results[0]?.analysis}</Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>🔮 Phân Tích Thần Số Học AI</Text>
        
        <TouchableOpacity
          style={styles.modelSelector}
          onPress={() => setShowModelPicker(true)}
        >
          <Text style={styles.modelSelectorText}>
            AI Model: {selectedModels.length > 1 
              ? `${selectedModels.length} models` 
              : AI_MODELS.find(m => m.id === selectedModels[0])?.name}
          </Text>
          <Text style={styles.modelSelectorArrow}>▼</Text>
        </TouchableOpacity>
        
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Tên đầy đủ</Text>
          <TextInput
            style={styles.input}
            placeholder="Nguyễn Văn A (không bắt buộc)"
            value={formData.fullName}
            onChangeText={(text) => setFormData({...formData, fullName: text})}
          />
        </View>
        
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Ngày tháng năm sinh</Text>
          <TextInput
            style={styles.input}
            placeholder="01/01/1990 (không bắt buộc)"
            value={formData.birthDate}
            onChangeText={(text) => setFormData({...formData, birthDate: text})}
          />
        </View>
        
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Biển số xe</Text>
          <TextInput
            style={styles.input}
            placeholder="30A-12345 (không bắt buộc)"
            value={formData.licensePlate}
            onChangeText={(text) => setFormData({...formData, licensePlate: text})}
          />
        </View>
        
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Số điện thoại</Text>
          <TextInput
            style={styles.input}
            placeholder="0901234567 (không bắt buộc)"
            keyboardType="numeric"
            value={formData.phoneNumber}
            onChangeText={(text) => setFormData({...formData, phoneNumber: text})}
          />
        </View>
        
        <TouchableOpacity 
          style={[styles.button, loading && styles.buttonDisabled]} 
          onPress={handleAnalyze}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>🔍 Phân tích tổng hợp</Text>
          )}
        </TouchableOpacity>
        
        {renderResults()}
        {renderModelPicker()}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  modelSelector: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  modelSelectorText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  modelSelectorArrow: {
    fontSize: 16,
    color: '#666',
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
    color: '#555',
    fontWeight: '500',
  },
  input: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  button: {
    backgroundColor: '#4CAF50',
    padding: 18,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 30,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  modeToggle: {
    flexDirection: 'row',
    marginBottom: 20,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  modeButton: {
    flex: 1,
    padding: 12,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  modeButtonActive: {
    backgroundColor: '#4CAF50',
  },
  modeButtonText: {
    fontSize: 16,
    color: '#4CAF50',
  },
  modeButtonTextActive: {
    color: '#fff',
    fontWeight: 'bold',
  },
  modelItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modelItemSelected: {
    backgroundColor: '#e8f5e9',
  },
  modelInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  modelName: {
    fontSize: 16,
    color: '#333',
  },
  freeTag: {
    backgroundColor: '#4CAF50',
    color: '#fff',
    fontSize: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 5,
    fontWeight: 'bold',
  },
  defaultTag: {
    backgroundColor: '#2196F3',
    color: '#fff',
    fontSize: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 5,
  },
  checkmark: {
    fontSize: 20,
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  modalButton: {
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  resultsContainer: {
    marginBottom: 50,
  },
  resultsTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
    textAlign: 'center',
  },
  modelResultColumn: {
    width: 320,
    marginRight: 15,
    maxHeight: 500,
  },
  modelResultTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 15,
    textAlign: 'center',
  },
  resultCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  analysisText: {
    fontSize: 15,
    lineHeight: 26,
    color: '#444',
    textAlign: 'justify',
  },
});