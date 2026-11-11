import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useApp } from '../context/AppContext';
import { theme } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';

export default function LoginScreen() {
  const { login, isRTL, language, setLanguage, storeInfo } = useApp();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleLogin = async () => {
    setErrorMessage('');
    if (!username.trim() || !password.trim()) {
      setErrorMessage(
        isRTL
          ? 'يرجى إدخال اسم المستخدم وكلمة المرور!'
          : 'Veuillez saisir votre identifiant et votre mot de passe !'
      );
      return;
    }

    setIsLoading(true);
    try {
      const res = await login(username.trim(), password.trim());
      if (!res.success) {
        setErrorMessage(
          res.error ||
            (isRTL
              ? 'اسم المستخدم أو كلمة المرور غير صحيحة!'
              : 'Identifiant ou mot de passe incorrect !')
        );
      }
    } catch (err) {
      setErrorMessage(err.message || 'Erreur de connexion');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Language switch at top */}
        <View style={[styles.langBar, isRTL && styles.rowReverse]}>
          <TouchableOpacity
            style={[styles.langBtn, language === 'fr' && styles.langBtnActive]}
            onPress={() => setLanguage('fr')}
          >
            <Text style={[styles.langText, language === 'fr' && styles.langTextActive]}>
              🇫🇷 Français
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.langBtn, language === 'ar' && styles.langBtnActive]}
            onPress={() => setLanguage('ar')}
          >
            <Text style={[styles.langText, language === 'ar' && styles.langTextActive]}>
              🇩🇿 العربية
            </Text>
          </TouchableOpacity>
        </View>

        {/* Login Card */}
        <View style={styles.card}>
          {/* Logo / Header */}
          <View style={styles.logoWrapper}>
            <View style={styles.logoCircle}>
              <Ionicons name="storefront" size={40} color="#ffffff" />
            </View>
            <Text style={styles.appTitle}>{storeInfo.name || 'Store Soft'}</Text>
            <Text style={styles.appSubtitle}>
              {isRTL ? 'نظام إدارة المبيعات والمخزون' : 'Gestion de Caisse & Stock'}
            </Text>
          </View>

          {/* Error Message */}
          {errorMessage ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={18} color={theme.colors.danger} />
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          ) : null}

          {/* Username Input */}
          <Text style={[styles.label, isRTL && styles.textRight]}>
            {isRTL ? 'اسم المستخدم' : 'Nom d\'utilisateur'}
          </Text>
          <View style={[styles.inputContainer, isRTL && styles.rowReverse]}>
            <Ionicons name="person-outline" size={20} color={theme.colors.textSecondary} />
            <TextInput
              style={[styles.input, isRTL && styles.textRight]}
              value={username}
              onChangeText={(val) => {
                setUsername(val);
                setErrorMessage('');
              }}
              placeholder="Ex: hadjali49"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {/* Password Input */}
          <Text style={[styles.label, isRTL && styles.textRight]}>
            {isRTL ? 'كلمة المرور' : 'Mot de passe'}
          </Text>
          <View style={[styles.inputContainer, isRTL && styles.rowReverse]}>
            <Ionicons name="lock-closed-outline" size={20} color={theme.colors.textSecondary} />
            <TextInput
              style={[styles.input, isRTL && styles.textRight]}
              value={password}
              onChangeText={(val) => {
                setPassword(val);
                setErrorMessage('');
              }}
              placeholder="••••••••"
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              onSubmitEditing={handleLogin}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
              <Ionicons
                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                size={20}
                color={theme.colors.textSecondary}
              />
            </TouchableOpacity>
          </View>

          {/* Login Button */}
          <TouchableOpacity
            style={[styles.loginBtn, isLoading && styles.loginBtnDisabled]}
            onPress={handleLogin}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <View style={[styles.btnRow, isRTL && styles.rowReverse]}>
                <Text style={styles.loginBtnText}>
                  {isRTL ? 'تسجيل الدخول' : 'Se connecter'}
                </Text>
                <Ionicons
                  name={isRTL ? 'arrow-back' : 'arrow-forward'}
                  size={18}
                  color="#ffffff"
                  style={{ marginHorizontal: 6 }}
                />
              </View>
            )}
          </TouchableOpacity>

          {/* Security footnote */}
          <View style={styles.footerInfo}>
            <Ionicons name="cloud-done-outline" size={14} color={theme.colors.textMuted} />
            <Text style={styles.footerText}>
              {isRTL ? 'بيانات مؤمنة ومتزامنة مع فايربيس' : 'Base de données synchronisée sur Firebase'}
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f1f5f9',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  rowReverse: {
    flexDirection: 'row-reverse',
  },
  textRight: {
    textAlign: 'right',
  },
  langBar: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  langBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: theme.borderRadius.full,
    backgroundColor: '#ffffff',
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  langBtnActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  langText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },
  langTextActive: {
    color: '#ffffff',
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#ffffff',
    borderRadius: theme.borderRadius.lg,
    padding: 28,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  logoWrapper: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logoCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    elevation: 3,
  },
  appTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  appSubtitle: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  credentialBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primaryLight,
    padding: 10,
    borderRadius: theme.borderRadius.md,
    marginBottom: 16,
  },
  credentialText: {
    fontSize: 12,
    color: theme.colors.primary,
    marginLeft: 8,
    fontWeight: '600',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.dangerLight,
    padding: 10,
    borderRadius: theme.borderRadius.md,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 12,
    color: theme.colors.danger,
    marginLeft: 8,
    flex: 1,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 6,
    marginTop: 10,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: 12,
    backgroundColor: '#f8fafc',
    height: 46,
  },
  input: {
    flex: 1,
    height: 46,
    marginLeft: 10,
    fontSize: 14,
    color: theme.colors.text,
  },
  eyeBtn: {
    padding: 6,
  },
  loginBtn: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.full,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    elevation: 2,
  },
  loginBtnDisabled: {
    opacity: 0.7,
  },
  btnRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loginBtnText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 15,
  },
  footerInfo: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  footerText: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginLeft: 6,
  },
});
