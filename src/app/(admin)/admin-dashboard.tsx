import { StyleSheet, View } from 'react-native';
import AdminTabNavigator from '@/screens/admin/AdminTabNavigator';

export default function AdminDashboardRoute() {
  return (
    <View style={styles.container}>
      <AdminTabNavigator />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
