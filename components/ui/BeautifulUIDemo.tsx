import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { Colors, Spacing, Typography } from '../constants/Theme';
import { BackgroundWrapper } from '../components/common/BackgroundWrapper';
import {
  SkeletonCard,
  SkeletonList,
  SkeletonGrid,
  BeautifulModal,
  ConfirmModal,
  AlertModal,
  BeautifulBottomSheet,
  BeautifulBottomMenu,
} from '../components/ui';
import {
  useToast,
  useModal,
  useConfirmModal,
  useAlertModal,
  useBottomSheet,
} from '../hooks';
import { Menu, Copy, Share2, Trash2 } from 'lucide-react-native';
import { GlassCard } from '../components/home/GlassCard';

/**
 * Beautiful UI Components Demo
 * 
 * This component demonstrates all the beautiful UI features:
 * - Skeleton Loaders
 * - Toast Notifications
 * - Modals (Regular, Confirm, Alert)
 * - Bottom Sheets (Custom, Menu)
 */
export default function BeautifulUIDemo() {
  const { success, error, warning, info } = useToast();
  const { visible: modalVisible, openModal, closeModal } = useModal();
  const {
    visible: confirmVisible,
    showConfirm,
    closeConfirm,
    isLoading: confirmLoading,
  } = useConfirmModal();
  const {
    visible: alertVisible,
    showAlert,
    closeAlert,
    ...alertState
  } = useAlertModal();
  const { visible: sheetVisible, openSheet, closeSheet } = useBottomSheet();
  const {
    visible: menuVisible,
    openSheet: openMenu,
    closeSheet: closeMenu,
  } = useBottomSheet();

  const [showSkeleton, setShowSkeleton] = React.useState(false);

  // Menu options for bottom menu demo
  const menuOptions = [
    {
      id: 'copy',
      label: 'Copy',
      icon: <Copy size={20} color={Colors.cyan} />,
      onPress: () => success('Copied', 'Item copied to clipboard'),
    },
    {
      id: 'share',
      label: 'Share',
      icon: <Share2 size={20} color={Colors.cyan} />,
      onPress: () => info('Share', 'Opening share options'),
    },
    {
      id: 'delete',
      label: 'Delete',
      icon: <Trash2 size={20} color={Colors.error} />,
      onPress: () => warning('Delete', 'Item will be permanently removed'),
      isDangerous: true,
    },
  ];

  return (
    <BackgroundWrapper>
      <SafeAreaView style={styles.container}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
        >
          {/* Header */}
          <Text style={[styles.title, Typography.threeD]}>
            BEAUTIFUL UI SYSTEM
          </Text>
          <Text style={styles.subtitle}>
            All components use glass morphism design
          </Text>

          {/* Toast Notifications Section */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, Typography.threeD]}>
              🎉 Toast Notifications
            </Text>

            <TouchableOpacity
              style={[styles.button, { backgroundColor: Colors.success + '30' }]}
              onPress={() =>
                success('Success!', 'Operation completed successfully')
              }
            >
              <Text style={[styles.buttonText, { color: Colors.success }]}>
                Success Toast
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, { backgroundColor: Colors.error + '30' }]}
              onPress={() => error('Oops!', 'Something went wrong')}
            >
              <Text style={[styles.buttonText, { color: Colors.error }]}>
                Error Toast
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, { backgroundColor: Colors.cyan + '30' }]}
              onPress={() =>
                info('Information', 'This is an info message')
              }
            >
              <Text style={[styles.buttonText, { color: Colors.cyan }]}>
                Info Toast
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, { backgroundColor: '#FFA500' + '30' }]}
              onPress={() => warning('Warning', 'Please be careful')}
            >
              <Text style={[styles.buttonText, { color: '#FFA500' }]}>
                Warning Toast
              </Text>
            </TouchableOpacity>
          </View>

          {/* Skeleton Loaders Section */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, Typography.threeD]}>
              ⚡ Skeleton Loaders
            </Text>

            {showSkeleton ? (
              <>
                <Text style={styles.label}>Loading...</Text>
                <SkeletonCard />
                <SkeletonCard />
              </>
            ) : (
              <TouchableOpacity
                style={[styles.button, { backgroundColor: Colors.cyan + '30' }]}
                onPress={() => {
                  setShowSkeleton(true);
                  setTimeout(() => setShowSkeleton(false), 3000);
                }}
              >
                <Text style={[styles.buttonText, { color: Colors.cyan }]}>
                  Show Skeleton Loading
                </Text>
              </TouchableOpacity>
            )}

            <Text style={[styles.label, { marginTop: Spacing.m }]}>
              Grid Layout
            </Text>
            <SkeletonGrid count={6} columns={3} />
          </View>

          {/* Modals Section */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, Typography.threeD]}>
              🔔 Modals
            </Text>

            <TouchableOpacity
              style={[styles.button, { backgroundColor: Colors.cyan + '30' }]}
              onPress={() => openModal()}
            >
              <Text style={[styles.buttonText, { color: Colors.cyan }]}>
                Open Custom Modal
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, { backgroundColor: Colors.worker + '30' }]}
              onPress={() =>
                showConfirm(
                  'Delete Item',
                  'Are you sure you want to delete this item?',
                  () => {
                    success('Deleted', 'Item has been deleted');
                    closeConfirm();
                  }
                )
              }
            >
              <Text style={[styles.buttonText, { color: Colors.worker }]}>
                Show Confirm Modal
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, { backgroundColor: Colors.success + '30' }]}
              onPress={() =>
                showAlert(
                  'Success!',
                  'Your operation completed successfully',
                  closeAlert,
                  'success'
                )
              }
            >
              <Text style={[styles.buttonText, { color: Colors.success }]}>
                Show Alert Modal
              </Text>
            </TouchableOpacity>
          </View>

          {/* Bottom Sheets Section */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, Typography.threeD]}>
              📄 Bottom Sheets
            </Text>

            <TouchableOpacity
              style={[styles.button, { backgroundColor: Colors.cyan + '30' }]}
              onPress={() => openSheet()}
            >
              <Text style={[styles.buttonText, { color: Colors.cyan }]}>
                Open Custom Bottom Sheet
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, { backgroundColor: Colors.worker + '30' }]}
              onPress={() => openMenu()}
            >
              <Text style={[styles.buttonText, { color: Colors.worker }]}>
                Open Bottom Menu
              </Text>
            </TouchableOpacity>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>

        {/* Custom Modal */}
        <BeautifulModal
          visible={modalVisible}
          onClose={closeModal}
          title="Beautiful Modal"
          glowColor={Colors.cyan}
        >
          <Text style={styles.modalText}>
            This is a beautiful custom modal with glass morphism design and smooth
            Reanimated animations.
          </Text>
          <TouchableOpacity
            style={[styles.button, { marginTop: Spacing.l, backgroundColor: Colors.cyan + '30' }]}
            onPress={closeModal}
          >
            <Text style={[styles.buttonText, { color: Colors.cyan }]}>
              Close Modal
            </Text>
          </TouchableOpacity>
        </BeautifulModal>

        {/* Confirm Modal */}
        <ConfirmModal
          visible={confirmVisible}
          onConfirm={() => {
            success('Confirmed', 'Action completed');
            closeConfirm();
          }}
          onCancel={closeConfirm}
          title="Delete Item"
          message="Are you sure you want to delete this item? This action cannot be undone."
          confirmText="Delete"
          cancelText="Cancel"
          confirmColor={Colors.error}
          isLoading={confirmLoading}
        />

        {/* Alert Modal */}
        <AlertModal
          visible={alertVisible}
          onDismiss={closeAlert}
          title={alertState.title}
          message={alertState.message}
          type={alertState.type}
          buttonText={alertState.buttonText}
        />

        {/* Custom Bottom Sheet */}
        <BeautifulBottomSheet
          visible={sheetVisible}
          onClose={closeSheet}
          title="Bottom Sheet"
          height={400}
          glowColor={Colors.cyan}
        >
          <Text style={styles.bottomSheetText}>
            This is a draggable bottom sheet with smooth animations. Drag the
            indicator at the top to dismiss.
          </Text>
          <GlassCard style={{ marginTop: Spacing.l, padding: Spacing.m }}>
            <Text style={styles.bottomSheetText}>
              You can put any content here - forms, lists, filters, etc.
            </Text>
          </GlassCard>
        </BeautifulBottomSheet>

        {/* Bottom Menu */}
        <BeautifulBottomMenu
          visible={menuVisible}
          onClose={closeMenu}
          options={menuOptions}
          title="Actions"
        />
      </SafeAreaView>
    </BackgroundWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.l,
    paddingBottom: Spacing.xl,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: '#fff',
    marginBottom: Spacing.s,
    marginTop: Spacing.l,
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 12,
    color: Colors.textMuted,
    fontWeight: '600',
    marginBottom: Spacing.xl,
    letterSpacing: 0.5,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#fff',
    marginBottom: Spacing.l,
    letterSpacing: 0.5,
  },
  label: {
    fontSize: 12,
    color: Colors.textDim,
    fontWeight: '700',
    marginBottom: Spacing.m,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  button: {
    paddingVertical: Spacing.m,
    paddingHorizontal: Spacing.l,
    borderRadius: 12,
    marginBottom: Spacing.m,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
  },
  buttonText: {
    fontWeight: '700',
    fontSize: 14,
  },
  modalText: {
    fontSize: 14,
    color: Colors.textMuted,
    lineHeight: 22,
    marginBottom: Spacing.l,
  },
  bottomSheetText: {
    fontSize: 14,
    color: Colors.textMuted,
    lineHeight: 22,
  },
});
