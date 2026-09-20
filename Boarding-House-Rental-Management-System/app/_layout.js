import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  // CONTAINER
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },

  // MOBILE HEADER
  mobileHeader: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  mobileHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  greetingText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  displayName: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0f172a',
    marginTop: 4,
  },
  avatarButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarIcon: {
    fontSize: 20,
  },

  // ROLE SWITCHER (for demo)
  roleSwitcher: {
    flexDirection: 'row',
    gap: 8,
  },
  roleChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  roleChipActive: {
    backgroundColor: '#0f172a',
    borderColor: '#0f172a',
  },
  roleChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
  },
  roleChipTextActive: {
    color: '#ffffff',
  },

  // SCROLL VIEW
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },

  // CONTENT MODULE
  contentModule: {
    padding: 16,
    gap: 16,
  },

  // BOTTOM NAVIGATION
  bottomNavBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    paddingTop: 12,
    paddingBottom: 28,
    paddingHorizontal: 8,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 8,
  },
  bottomNavItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  bottomNavIcon: {
    fontSize: 22,
    opacity: 0.5,
  },
  bottomNavIconActive: {
    opacity: 1,
  },
  bottomNavLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#94a3b8',
  },
  bottomNavLabelActive: {
    color: '#0f172a',
    fontWeight: '800',
  },

  // HERO CARD (Tenant Balance)
  heroCard: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#8b5cf6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
  },
  heroGradient: {
    backgroundColor: '#8b5cf6',
    padding: 24,
  },
  heroLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: 'rgba(255, 255, 255, 0.8)',
    letterSpacing: 1,
  },
  heroAmount: {
    fontSize: 42,
    fontWeight: '900',
    color: '#ffffff',
    marginTop: 8,
  },
  heroBadge: {
    marginTop: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  heroBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },

  // CARD
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 12,
  },

  // BILL ROW
  billRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  billRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  billIcon: {
    fontSize: 20,
  },
  billLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
  billValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },

  // BUTTONS
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: '#10b981',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  primaryButtonText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#ffffff',
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: '#ffffff',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e2e8f0',
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#475569',
  },

  // SECTION TITLE
  sectionTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0f172a',
    marginTop: 8,
    marginBottom: 4,
  },

  // QUICK GRID
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  quickCard: {
    flex: 1,
    minWidth: '46%',
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  quickCardIcon: {
    fontSize: 32,
  },
  quickCardLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    textAlign: 'center',
  },

  // STATS ROW (Caretaker)
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  miniCard: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  miniCardValue: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0f172a',
  },
  miniCardLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
    marginTop: 4,
  },

  // PRIORITY CARD
  priorityCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    borderLeftWidth: 4,
    borderLeftColor: '#64748b',
  },
  priorityCardUrgent: {
    borderLeftColor: '#ef4444',
  },
  priorityCardWarning: {
    borderLeftColor: '#f59e0b',
  },
  priorityCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  priorityCardLeft: {
    flex: 1,
  },
  priorityCardName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  priorityCardRoom: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    marginTop: 2,
  },
  priorityCardRight: {
    alignItems: 'flex-end',
  },
  priorityBadge: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  priorityBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#92400e',
  },
  priorityAmount: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0f172a',
  },
  priorityDescription: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  priorityAction: {
    backgroundColor: '#0f172a',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 4,
  },
  priorityActionText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#ffffff',
  },

  // ROOM CARD
  roomCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  roomCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  roomNumberBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  roomNumberText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0f172a',
  },
  roomCardInfo: {
    flex: 1,
  },
  roomCardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  roomCardSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94a3b8',
    marginTop: 2,
  },

  // BED ROW
  bedRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  bedIcon: {
    fontSize: 20,
    marginTop: 4,
  },
  bedInfo: {
    flex: 1,
  },
  bedLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94a3b8',
    letterSpacing: 0.5,
  },
  bedOccupant: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
    marginTop: 4,
  },
  bedVacant: {
    color: '#94a3b8',
  },
  bedStatus: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    marginTop: 2,
  },
  assignButton: {
    marginTop: 8,
    backgroundColor: '#10b981',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  assignButtonText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#ffffff',
  },

  // OWNER - PROPERTY HEADER
  propertyHeader: {
    backgroundColor: '#f59e0b',
    borderRadius: 16,
    padding: 20,
  },
  propertyTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#ffffff',
  },
  propertySubtitle: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 4,
  },

  // STATS GRID (Owner)
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: '46%',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    borderLeftWidth: 4,
  },
  statIcon: {
    fontSize: 28,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0f172a',
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
  },
  statDetail: {
    fontSize: 10,
    fontWeight: '600',
    color: '#94a3b8',
  },

  // SUMMARY ROW
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  summaryRowTotal: {
    borderBottomWidth: 0,
    paddingTop: 16,
    marginTop: 8,
    borderTopWidth: 2,
    borderTopColor: '#e2e8f0',
  },
  summaryLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  summaryLabelBold: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  summaryValueBold: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0f172a',
  },

  // ACTIVITY CARD
  activityCard: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  activityIcon: {
    fontSize: 24,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  activitySubtitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    marginTop: 2,
  },
  activityTime: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94a3b8',
    marginTop: 4,
  },
});
