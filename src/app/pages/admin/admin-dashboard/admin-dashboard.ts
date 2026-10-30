import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../../core/auth.service';
import { AdminService, AdminMetrics } from '../../../core/admin.service';
import { PaymentRecord, BulkActionResult } from '../../../core/models';
import { environment } from '../../../../environments/environment';

export type AdminTab = 'dashboard' | 'users' | 'memberships' | 'plans' | 'orders' | 'payments' | 'audit' | 'config';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-dashboard.html',
  styleUrls: ['./admin-dashboard.css'],
})
export class AdminDashboard implements OnInit {
  private http = inject(HttpClient);
  private cdr = inject(ChangeDetectorRef);
  readonly auth = inject(AuthService);
  private adminService = inject(AdminService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  activeTab: AdminTab = 'dashboard';

  // Métricas
  metrics: AdminMetrics | null = null;
  systemConfig: any = null;

  // Listados principales
  users: any[] = [];
  memberships: any[] = [];
  plans: any[] = [];
  orders: any[] = [];
  payments: PaymentRecord[] = [];
  auditLogs: any[] = [];

  // Filtros y búsquedas
  userSearch: string = '';
  userFilter: string = 'all';
  membershipSearch: string = '';
  membershipStatusFilter: string = 'all';
  paymentStatusFilter: string = 'pending_verification';
  paymentSearch: string = '';

  // Estados de carga y alertas
  isLoading: boolean = false;
  statusMessage: string | null = null;
  errorMessage: string | null = null;

  // Modales interactivos de usuario
  selectedUserDetail: any = null;
  userEditForm: any = null;
  userToDelete: any = null;
  deleteReason: string = '';

  // Selección múltiple de usuarios
  selectedUserIds: Set<number> = new Set<number>();
  bulkActionType: 'activate' | 'inactivate' | 'delete' | null = null;
  bulkActionReason: string = '';
  isBulkActionSubmitting: boolean = false;

  // Modales interactivos de membresía
  membershipToEdit: any = null;
  membershipEditForm: { end_date: string; status: string; notes: string; reason: string } = {
    end_date: '',
    status: 'active',
    notes: '',
    reason: '',
  };

  // Modales interactivos de planes
  planToEdit: any = null;
  planEditForm: { name: string; price: number; duration_days: number; description: string; is_active: boolean; reason: string } = {
    name: '',
    price: 0,
    duration_days: 30,
    description: '',
    is_active: true,
    reason: '',
  };
  selectedPlanHistory: any[] | null = null;
  selectedPlanName: string = '';

  // Modales interactivos de verificación de pagos
  paymentToApprove: PaymentRecord | null = null;
  paymentToReject: PaymentRecord | null = null;
  rejectReason: string = '';
  isPaymentSubmitting: boolean = false;
  previewReceiptPayment: PaymentRecord | null = null;
  previewReceiptUrl: string | null = null;

  ngOnInit() {
    if (!this.auth.hasRole('admin')) {
      this.router.navigate(['/admin/login']);
      return;
    }

    // Detectar tab según la URL actual
    const url = this.router.url;
    if (url.includes('/admin/users')) {
      this.activeTab = 'users';
    } else if (url.includes('/admin/memberships')) {
      this.activeTab = 'memberships';
    } else if (url.includes('/admin/plans')) {
      this.activeTab = 'plans';
    } else if (url.includes('/admin/orders')) {
      this.activeTab = 'orders';
    } else if (url.includes('/admin/payments')) {
      this.activeTab = 'payments';
    } else if (url.includes('/admin/audit')) {
      this.activeTab = 'audit';
    } else if (url.includes('/admin/config')) {
      this.activeTab = 'config';
    } else {
      this.activeTab = 'dashboard';
    }

    this.loadAllData();
  }

  loadAllData() {
    this.isLoading = true;
    this.loadMetrics();
    this.loadUsers();
    this.loadMemberships();
    this.loadPlans();
    this.loadOrders();
    this.loadPayments();
    this.loadAuditLogs();
    this.loadConfig();
  }

  setTab(tab: AdminTab) {
    this.activeTab = tab;
    this.statusMessage = null;
    this.errorMessage = null;

    if (tab === 'dashboard') {
      window.history.replaceState({}, '', '/admin/dashboard');
    } else {
      window.history.replaceState({}, '', `/admin/${tab}`);
    }

    if (tab === 'users') {
      this.loadUsers();
    } else if (tab === 'memberships') {
      this.loadMemberships();
    } else if (tab === 'plans') {
      this.loadPlans();
    } else if (tab === 'orders') {
      this.loadOrders();
    } else if (tab === 'payments') {
      this.loadPayments();
    } else if (tab === 'audit') {
      this.loadAuditLogs();
    } else if (tab === 'config') {
      this.loadConfig();
    }
    this.cdr.markForCheck();
  }

  // --- Carga de datos ---
  loadMetrics() {
    this.adminService.getMetrics().subscribe({
      next: (m) => {
        this.metrics = m;
        this.isLoading = false;
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err?.error?.error || 'Error al cargar métricas';
      },
    });
  }

  loadUsers() {
    this.adminService.getUsers(this.userSearch, this.userFilter).subscribe({
      next: (u) => {
        this.users = u;
        // Limpiar selecciones que ya no existan en la lista
        const validIds = new Set(this.users.map((item) => item.id));
        const filtered = Array.from(this.selectedUserIds).filter((id) => validIds.has(id));
        this.selectedUserIds = new Set(filtered);
      },
      error: () => {},
    });
  }

  loadMemberships() {
    this.adminService.getMemberships(this.membershipSearch, this.membershipStatusFilter).subscribe({
      next: (m) => (this.memberships = m),
      error: () => {},
    });
  }

  loadPlans() {
    this.adminService.getPlans().subscribe({
      next: (p) => (this.plans = p),
      error: () => {},
    });
  }

  loadOrders() {
    this.adminService.getOrders().subscribe({
      next: (o) => (this.orders = o),
      error: () => {},
    });
  }

  loadPayments() {
    this.adminService.getPayments(this.paymentStatusFilter, this.paymentSearch).subscribe({
      next: (p) => (this.payments = p),
      error: () => {},
    });
  }

  loadAuditLogs() {
    this.adminService.getAuditLogs().subscribe({
      next: (a) => (this.auditLogs = a),
      error: () => {},
    });
  }

  loadConfig() {
    this.adminService.getConfig().subscribe({
      next: (c) => (this.systemConfig = c),
      error: () => {},
    });
  }

  // --- Selección múltiple de usuarios ---
  get selectableUsers(): any[] {
    const currentAdminId = this.auth.user()?.id;
    return this.users.filter((u) => u.id !== currentAdminId);
  }

  get selectedCount(): number {
    return this.selectedUserIds.size;
  }

  get isAllUsersSelected(): boolean {
    const selectable = this.selectableUsers;
    if (selectable.length === 0) return false;
    return selectable.every((u) => this.selectedUserIds.has(u.id));
  }

  toggleSelectAllUsers() {
    const selectable = this.selectableUsers;
    const next = new Set<number>();
    if (!this.isAllUsersSelected) {
      selectable.forEach((u) => next.add(u.id));
    }
    this.selectedUserIds = next;
    this.cdr.markForCheck();
  }

  toggleSelectUser(id: number) {
    if (id === this.auth.user()?.id) {
      return; // No se puede seleccionar al admin actual
    }
    const next = new Set(this.selectedUserIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    this.selectedUserIds = next;
    this.cdr.markForCheck();
  }

  isUserSelected(id: number): boolean {
    return this.selectedUserIds.has(id);
  }

  clearUserSelection() {
    this.selectedUserIds = new Set<number>();
    this.cdr.markForCheck();
  }

  openBulkActionModal(type: 'activate' | 'inactivate' | 'delete') {
    if (this.selectedUserIds.size === 0) return;
    this.bulkActionType = type;
    if (type === 'activate') {
      this.bulkActionReason = 'Activación masiva autorizada por administración';
    } else if (type === 'inactivate') {
      this.bulkActionReason = 'Inactivación preventiva masiva por administración';
    } else {
      this.bulkActionReason = 'Baja lógica masiva segura de cuentas inactivas';
    }
  }

  closeBulkActionModal() {
    this.bulkActionType = null;
    this.bulkActionReason = '';
    this.isBulkActionSubmitting = false;
  }

  confirmBulkAction() {
    if (!this.bulkActionType || this.selectedUserIds.size === 0 || this.isBulkActionSubmitting) return;

    this.isBulkActionSubmitting = true;
    const userIds = Array.from(this.selectedUserIds);

    if (this.bulkActionType === 'activate' || this.bulkActionType === 'inactivate') {
      const isActive = this.bulkActionType === 'activate';
      this.adminService.bulkUpdateUserStatus(userIds, isActive, this.bulkActionReason).subscribe({
        next: (res) => {
          this.statusMessage = res.message;
          this.closeBulkActionModal();
          this.clearUserSelection();
          this.loadUsers();
          this.loadMetrics();
          this.loadAuditLogs();
        },
        error: (err) => {
          this.isBulkActionSubmitting = false;
          this.errorMessage = err?.error?.error || 'Error al ejecutar la acción masiva';
        },
      });
    } else if (this.bulkActionType === 'delete') {
      this.adminService.bulkDeleteUsers(userIds, this.bulkActionReason).subscribe({
        next: (res) => {
          this.statusMessage = res.message;
          this.closeBulkActionModal();
          this.clearUserSelection();
          this.loadUsers();
          this.loadMetrics();
          this.loadAuditLogs();
        },
        error: (err) => {
          this.isBulkActionSubmitting = false;
          this.errorMessage = err?.error?.error || 'Error al ejecutar la baja lógica masiva';
        },
      });
    }
  }

  // --- Acciones de Usuarios Individuales ---
  viewUserDetail(userId: number) {
    this.adminService.getUserDetail(userId).subscribe({
      next: (res) => {
        this.selectedUserDetail = res;
      },
      error: (err) => {
        this.errorMessage = err?.error?.error || 'Error al consultar detalle del usuario';
      },
    });
  }

  closeUserDetail() {
    this.selectedUserDetail = null;
  }

  openEditUser(user: any) {
    this.userEditForm = {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone || '',
      birth_date: user.birth_date ? user.birth_date.substring(0, 10) : '',
      gender: user.gender || 'prefiero_no_decir',
      emergency_contact: user.emergency_contact || '',
      emergency_phone: user.emergency_phone || '',
      medical_notes: user.medical_notes || '',
      reason: 'Actualización administrativa de datos personales',
    };
  }

  closeEditUser() {
    this.userEditForm = null;
  }

  saveUserEdit() {
    if (!this.userEditForm) return;

    this.adminService.updateUser(this.userEditForm.id, this.userEditForm).subscribe({
      next: (updated) => {
        this.statusMessage = `Datos de ${updated.name} actualizados exitosamente.`;
        this.closeEditUser();
        this.loadUsers();
        this.loadAuditLogs();
      },
      error: (err) => {
        this.errorMessage = err?.error?.error || 'Error al actualizar datos del usuario';
      },
    });
  }

  toggleUser(user: any) {
    const newStatus = !user.is_active;
    const actionName = newStatus ? 'activar' : 'inactivar';
    const reason = `Cambio de estado administrativo a: ${actionName}`;

    this.adminService.toggleUserStatus(user.id, newStatus, reason).subscribe({
      next: () => {
        user.is_active = newStatus;
        this.statusMessage = `Usuario ${user.name} ${newStatus ? 'activado' : 'inactivado'} correctamente.`;
        this.loadMetrics();
        this.loadAuditLogs();
      },
      error: (err) => {
        this.errorMessage = err?.error?.error || 'Error al actualizar estado del usuario';
      },
    });
  }

  openDeleteConfirm(user: any) {
    this.userToDelete = user;
    this.deleteReason = 'Solicitud administrativa de baja de cuenta';
  }

  closeDeleteConfirm() {
    this.userToDelete = null;
    this.deleteReason = '';
  }

  confirmSafeDeleteUser() {
    if (!this.userToDelete) return;

    this.adminService.deleteUser(this.userToDelete.id, this.deleteReason).subscribe({
      next: (res) => {
        this.statusMessage = `Usuario ${this.userToDelete.name} eliminado lógicamente de forma segura. Se conservan ${res.retained_records?.orders || 0} pedidos y ${res.retained_records?.memberships || 0} membresías para integridad contable.`;
        this.closeDeleteConfirm();
        this.loadUsers();
        this.loadMetrics();
        this.loadAuditLogs();
      },
      error: (err) => {
        this.errorMessage = err?.error?.error || 'Error al eliminar usuario';
      },
    });
  }

  // --- Verificación y Gestión de Pagos por Transferencia ---
  openApproveConfirm(payment: PaymentRecord) {
    this.paymentToApprove = payment;
  }

  closeApproveConfirm() {
    this.paymentToApprove = null;
    this.isPaymentSubmitting = false;
  }

  confirmApprovePayment() {
    if (!this.paymentToApprove || this.isPaymentSubmitting) return;

    this.isPaymentSubmitting = true;
    this.adminService.approvePayment(this.paymentToApprove.id).subscribe({
      next: (res) => {
        this.statusMessage = `Pago #${this.paymentToApprove?.id} aprobado exitosamente. Membresía activada para el cliente ${this.paymentToApprove?.user_name}.`;
        this.closeApproveConfirm();
        this.loadPayments();
        this.loadMetrics();
        this.loadMemberships();
        this.loadAuditLogs();
      },
      error: (err) => {
        this.isPaymentSubmitting = false;
        this.errorMessage = err?.error?.error || 'Error al aprobar el pago';
      },
    });
  }

  openRejectModal(payment: PaymentRecord) {
    this.paymentToReject = payment;
    this.rejectReason = '';
  }

  closeRejectModal() {
    this.paymentToReject = null;
    this.rejectReason = '';
    this.isPaymentSubmitting = false;
  }

  confirmRejectPayment() {
    if (!this.paymentToReject || !this.rejectReason.trim() || this.isPaymentSubmitting) {
      this.errorMessage = 'Es obligatorio indicar un motivo del rechazo (mínimo 5 caracteres).';
      return;
    }

    this.isPaymentSubmitting = true;
    this.adminService.rejectPayment(this.paymentToReject.id, this.rejectReason.trim()).subscribe({
      next: () => {
        this.statusMessage = `Pago #${this.paymentToReject?.id} rechazado. El cliente ha sido notificado del motivo y no se activó ninguna membresía.`;
        this.closeRejectModal();
        this.loadPayments();
        this.loadMetrics();
        this.loadAuditLogs();
      },
      error: (err) => {
        this.isPaymentSubmitting = false;
        this.errorMessage = err?.error?.error || 'Error al rechazar el pago';
      },
    });
  }

  openReceiptModal(payment: PaymentRecord) {
    this.previewReceiptPayment = payment;
    this.http.get(`${environment.apiUrl}/payments/${payment.id}/receipt`, { responseType: 'blob' }).subscribe({
      next: (blob) => {
        this.previewReceiptUrl = URL.createObjectURL(blob);
      },
      error: () => {
        alert('No se pudo cargar el archivo del comprobante.');
        this.closeReceiptModal();
      },
    });
  }

  closeReceiptModal() {
    if (this.previewReceiptUrl) {
      URL.revokeObjectURL(this.previewReceiptUrl);
      this.previewReceiptUrl = null;
    }
    this.previewReceiptPayment = null;
  }

  // --- Acciones de Membresías ---
  openEditMembership(mem: any) {
    this.membershipToEdit = mem;
    this.membershipEditForm = {
      end_date: mem.end_date ? mem.end_date.substring(0, 10) : '',
      status: mem.status,
      notes: mem.notes || '',
      reason: '',
    };
  }

  closeEditMembership() {
    this.membershipToEdit = null;
  }

  saveMembershipEdit() {
    if (!this.membershipToEdit) return;
    if (!this.membershipEditForm.reason.trim()) {
      this.errorMessage = 'Es obligatorio indicar un motivo para la modificación de la membresía.';
      return;
    }

    this.adminService.updateMembership(this.membershipToEdit.id, this.membershipEditForm).subscribe({
      next: () => {
        this.statusMessage = `Membresía #${this.membershipToEdit.id} modificada exitosamente.`;
        this.closeEditMembership();
        this.loadMemberships();
        this.loadMetrics();
        this.loadAuditLogs();
      },
      error: (err) => {
        this.errorMessage = err?.error?.error || 'Error al modificar membresía';
      },
    });
  }

  // --- Acciones de Planes ---
  openEditPlan(plan: any) {
    this.planToEdit = plan;
    this.planEditForm = {
      name: plan.name,
      price: parseFloat(plan.price),
      duration_days: plan.duration_days,
      description: plan.description || '',
      is_active: plan.is_active,
      reason: 'Ajuste administrativo de catálogo',
    };
  }

  closeEditPlan() {
    this.planToEdit = null;
  }

  savePlanEdit() {
    if (!this.planToEdit) return;

    this.adminService.updatePlan(this.planToEdit.id, this.planEditForm).subscribe({
      next: (updated) => {
        this.statusMessage = `Plan ${updated.name} actualizado exitosamente a $${updated.price} COP (${updated.duration_days} días). Las membresías previas conservan sus condiciones históricas.`;
        this.closeEditPlan();
        this.loadPlans();
        this.loadAuditLogs();
      },
      error: (err) => {
        this.errorMessage = err?.error?.error || 'Error al actualizar el plan';
      },
    });
  }

  togglePlan(plan: any) {
    const newStatus = !plan.is_active;
    this.adminService.togglePlanStatus(plan.id, newStatus).subscribe({
      next: () => {
        plan.is_active = newStatus;
        this.statusMessage = `Plan ${plan.name} ${newStatus ? 'activado' : 'desactivado'}.`;
        this.loadMetrics();
        this.loadAuditLogs();
      },
      error: (err) => {
        this.errorMessage = err?.error?.error || 'Error al actualizar plan';
      },
    });
  }

  viewPlanHistory(plan: any) {
    this.selectedPlanName = plan.name;
    this.adminService.getPlanHistory(plan.id).subscribe({
      next: (history) => {
        this.selectedPlanHistory = history;
      },
      error: (err) => {
        this.errorMessage = err?.error?.error || 'Error al consultar historial del plan';
      },
    });
  }

  closePlanHistory() {
    this.selectedPlanHistory = null;
    this.selectedPlanName = '';
  }

  logout() {
    this.auth.logout();
    this.router.navigate(['/admin/login']);
  }
}
