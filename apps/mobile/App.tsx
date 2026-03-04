import React from 'react';
import { View, Text } from 'react-native';
import { initiateTransactionSchema } from '@ghanatopup/shared';

export default function App() {
  const sample = {
    recipientNumber: '+233201234567',
    network: 'MTN',
    type: 'AIRTIME',
    amountGhs: 10
  };

  const parsed = initiateTransactionSchema.safeParse(sample);

  return (
    <View style={{flex:1, alignItems:'center', justifyContent:'center'}}>
      <Text style={{fontSize:18, fontWeight:'bold'}}>GhanaTopUp Mobile (Scaffold)</Text>
      <Text style={{marginTop:12}}>{parsed.success ? 'Schema OK' : JSON.stringify(parsed.error.format())}</Text>
    </View>
  );
}
