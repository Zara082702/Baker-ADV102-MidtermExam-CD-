import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFonts } from 'expo-font';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  ImageBackground,
  Modal, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View
} from 'react-native';

interface CD {
  id: number;
  title: string;
  artist: string;
  copies: number;
}

interface BorrowRecord {
  borrowId: string;
  cdId: number;
  title: string;
  borrowerName: string;
  borrowDate: string; 
  dueDate: string;
}

export default function CDManagerApp() {
  const [fontsLoaded] = useFonts({
    'Pacifico': require('../../font/Pacifico-Regular.ttf'),
  });

  // UPDATED INVENTORY TITLES
  const [inventory, setInventory] = useState<CD[]>([
    { id: 1, title: 'The Conjuring 2013', artist: 'James Wan', copies: 5 },
    { id: 2, title: 'Toy Story', artist: 'John Lasseter', copies: 4 },
    { id: 3, title: 'Shazam', artist: 'Zachary Levi', copies: 6 },
  ]);

  const [borrowedList, setBorrowedList] = useState<BorrowRecord[]>([]);
  const [totalIncome, setTotalIncome] = useState(0);
  const [allTimeBorrowed, setAllTimeBorrowed] = useState(0);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedCD, setSelectedCD] = useState<CD | null>(null);
  const [tempBorrowerName, setTempBorrowerName] = useState('');
  const [tempFee, setTempFee] = useState(''); 

  const PENALTY_RATE = 2; 

  useEffect(() => { loadData(); }, []);
  useEffect(() => { saveData(); }, [inventory, borrowedList, totalIncome, allTimeBorrowed]);

  const saveData = async () => {
    try {
      const data = { inventory, borrowedList, totalIncome, allTimeBorrowed };
      // UPDATED KEY TO v4 TO CLEAR OLD DATA
      await AsyncStorage.setItem('@cd_store_updated_v4', JSON.stringify(data));
    } catch (e) { console.error("Save Error"); }
  };

  const loadData = async () => {
    try {
      // UPDATED KEY TO v4 TO MATCH
      const saved = await AsyncStorage.getItem('@cd_store_updated_v4');
      if (saved) {
        const parsed = JSON.parse(saved);
        setInventory(parsed.inventory);
        setBorrowedList(parsed.borrowedList);
        setTotalIncome(parsed.totalIncome);
        setAllTimeBorrowed(parsed.allTimeBorrowed);
      }
    } catch (e) { console.error("Load Error"); }
  };

  const openBorrowModal = (cd: CD) => {
    if (cd.copies <= 0) {
      Alert.alert("Not Available", "This CD is currently out of stock.");
      return;
    }
    setSelectedCD(cd);
    setTempBorrowerName('');
    setTempFee('0'); 
    setModalVisible(true);
  };

  const confirmBorrow = () => {
    if (!tempBorrowerName.trim()) {
      Alert.alert("Required", "Please enter a borrower name.");
      return;
    }
    const feeAmount = parseFloat(tempFee) || 0;
    if (selectedCD) {
      const now = new Date();
      const due = new Date();
      due.setDate(now.getDate() + 7);
      const borrowTimestamp = now.toLocaleDateString() + ' ' + now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      const newRecord: BorrowRecord = {
        borrowId: Math.random().toString(36).substr(2, 9),
        cdId: selectedCD.id,
        title: selectedCD.title,
        borrowerName: tempBorrowerName,
        borrowDate: borrowTimestamp,
        dueDate: due.toISOString(),
      };

      setInventory(prev => prev.map(item => 
        item.id === selectedCD.id ? { ...item, copies: item.copies - 1 } : item
      ));
      setBorrowedList(prev => [...prev, newRecord]);
      setAllTimeBorrowed(prev => prev + 1);
      setTotalIncome(prev => prev + feeAmount);
      setModalVisible(false);
      setSelectedCD(null);
    }
  };

  const handleReturn = (record: BorrowRecord) => {
    const today = new Date();
    const dueDate = new Date(record.dueDate);
    let penalty = 0;
    if (today > dueDate) {
      const diffDays = Math.ceil(Math.abs(today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
      penalty = diffDays * PENALTY_RATE;
    }
    setInventory(prev => prev.map(item => 
      item.id === record.cdId ? { ...item, copies: item.copies + 1 } : item
    ));
    setBorrowedList(prev => prev.filter(item => item.borrowId !== record.borrowId));
    setTotalIncome(prev => prev + penalty);
    Alert.alert("Returned", penalty > 0 ? `Penalty Paid: PHP ${penalty}` : "Returned on time!");
  };

  const getLivePenalty = (dateStr: string) => {
    const today = new Date();
    const due = new Date(dateStr);
    if (today <= due) return 0;
    const days = Math.ceil(Math.abs(today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
    return days * PENALTY_RATE;
  };

  if (!fontsLoaded) return null;

  return (
    <ImageBackground 
      source={require('../../assets/images/midterm.jpg')} 
      style={styles.backgroundImage}
    >
      <SafeAreaView style={styles.container}>
        <Modal visible={modalVisible} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Borrowing: {selectedCD?.title}</Text>
              <Text style={styles.inputLabel}>Borrower's Name</Text>
              <TextInput style={styles.input} value={tempBorrowerName} onChangeText={setTempBorrowerName} autoFocus />
              <Text style={styles.inputLabel}>Borrow Fee (PHP)</Text>
              <TextInput style={styles.input} value={tempFee} onChangeText={setTempFee} keyboardType="numeric" />
              <View style={styles.modalButtons}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                  <Text style={styles.btnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.confirmBtn} onPress={confirmBorrow}>
                  <Text style={styles.btnText}>Confirm</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        <View style={styles.header}>
          <Text style={styles.headerText}> CD RENTAL TRACKER</Text>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>TOTAL INCOME</Text>
              <Text style={styles.statValue}>PHP {totalIncome}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>RENTALS</Text>
              <Text style={styles.statValue}>{allTimeBorrowed}</Text>
            </View>
          </View>
        </View>

        <ScrollView contentContainerStyle={{ padding: 15 }}>
          <Text style={styles.sectionHeader}>Available Inventory</Text>
          {inventory.map(cd => {
            const isOutOfStock = cd.copies <= 0;
            return (
              <View key={cd.id} style={styles.card}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cdTitle}>{cd.title}</Text>
                  <Text style={styles.cdArtist}>{cd.artist}</Text>
                  <Text style={[styles.stockText, isOutOfStock && styles.outOfStockText]}>
                    {isOutOfStock ? "CD NOT AVAILABLE" : `Available: ${cd.copies}`}
                  </Text>
                </View>
                <TouchableOpacity 
                  style={[styles.borrowBtn, isOutOfStock && styles.disabledBtn]} 
                  onPress={() => openBorrowModal(cd)}
                  disabled={isOutOfStock}
                >
                  <Text style={styles.btnText}>{isOutOfStock ? "EMPTY" : "BORROW"}</Text>
                </TouchableOpacity>
              </View>
            );
          })}

          <Text style={[styles.sectionHeader, { marginTop: 25 }]}>Currently Borrowed</Text>
          {borrowedList.length === 0 && <Text style={styles.emptyText}>No active records.</Text>}
          {borrowedList.map(record => (
            <View key={record.borrowId} style={[styles.card, styles.borrowedCard]}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cdTitle}>{record.title}</Text>
                <Text style={styles.info}><Text style={styles.bold}>By:</Text> {record.borrowerName}</Text>
                <Text style={styles.info}><Text style={styles.bold}>Due:</Text> {new Date(record.dueDate).toDateString()}</Text>
                <Text style={styles.penalty}>Current Penalty: PHP {getLivePenalty(record.dueDate)}</Text>
              </View>
              <TouchableOpacity style={styles.returnBtn} onPress={() => handleReturn(record)}>
                <Text style={styles.btnText}>RETURN</Text>
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  backgroundImage: { flex: 1, resizeMode: 'cover' },
  container: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.3)' },
  header: { backgroundColor: '#1e272e', padding: 20, borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },
  headerText: { color: 'white', fontSize: 18, fontWeight: 'bold', textAlign: 'center' },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 15 },
  statItem: { alignItems: 'center' },
  statLabel: { color: '#808e9b', fontSize: 10, fontWeight: 'bold' },
  statValue: { color: '#ffffff', fontSize: 18, fontWeight: 'bold' },
  sectionHeader: { fontSize: 22, color: '#1e272e', marginBottom: 10, fontFamily: 'Pacifico' },
  card: { backgroundColor: 'rgba(255, 255, 255, 0.9)', padding: 15, borderRadius: 12, marginBottom: 10, flexDirection: 'row', alignItems: 'center', elevation: 2 },
  borrowedCard: { borderLeftWidth: 5, borderLeftColor: '#ff3f34' },
  cdTitle: { fontSize: 18, color: '#660d5f', fontFamily: 'Pacifico' },
  cdArtist: { color: '#485460', fontSize: 14, fontWeight: 'heavy' },
  stockText: { color: '#660d5f', fontWeight: 'bold', fontSize: 13, marginTop: 2 },
  outOfStockText: { color: '#ff3f34' },
  info: { fontSize: 12, color: '#485460', marginTop: 2 },
  bold: { fontWeight: 'bold', color: '#1e272e' },
  penalty: { color: '#ff3f34', fontWeight: 'bold', fontSize: 13, marginTop: 5 },
  btnText: { color: 'white', fontWeight: 'bold', fontSize: 11 },
  borrowBtn: { backgroundColor: '#660d5f', padding: 10, borderRadius: 8, minWidth: 80, alignItems: 'center' },
  disabledBtn: { backgroundColor: '#808e9b' },
  returnBtn: { backgroundColor: '#3c40c6', padding: 10, borderRadius: 8, minWidth: 80, alignItems: 'center' },
  emptyText: { textAlign: 'center', color: '#808e9b', marginTop: 10, fontStyle: 'italic' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: 'white', width: '85%', padding: 25, borderRadius: 20 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, color: '#1e272e', textAlign: 'center' },
  inputLabel: { fontSize: 12, color: '#808e9b', marginBottom: 5, fontWeight: 'bold' },
  input: { borderWidth: 1, borderColor: '#d2dae2', padding: 12, borderRadius: 10, marginBottom: 20, fontSize: 16 },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-between' },
  cancelBtn: { backgroundColor: '#808e9b', padding: 12, borderRadius: 10, width: '48%', alignItems: 'center' },
  confirmBtn: { backgroundColor: '#660d5f', padding: 12, borderRadius: 10, width: '48%', alignItems: 'center' },
});