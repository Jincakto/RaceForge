package com.raceforge.backend.account.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "[User]")
<<<<<<< HEAD
public class User extends com.raceforge.backend.common.id.AssignedBusinessEntity {

    @Id
    @Column(name = "user_id", length = 20, updatable = false)
    private String userId;
=======
public class User extends com.raceforge.backend.common.id.BusinessEntity {

    @Id
    @Column(name = "user_id")
    private String userId;

    @jakarta.persistence.OneToMany(mappedBy="user", cascade=jakarta.persistence.CascadeType.ALL)
    private java.util.List<AccountRoleProfile> roleProfiles = new java.util.ArrayList<>();

    public java.util.List<AccountRoleProfile> getRoleProfiles() { return roleProfiles; }
>>>>>>> 76de6e5 (luu code)

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "role_id", nullable = false)
    private Role role;

    @Column(name = "full_name", nullable = false, length = 150)
    private String fullName;

    @Column(name = "email", nullable = false, unique = true, length = 255)
    private String email;

    @Column(name = "password")
    private String password;

    @Column(name = "phone", length = 20)
    private String phone;

    @Column(name = "status", nullable = false, length = 20)
    private String status;

    @Column(name = "email_verified", nullable = false)
    private boolean emailVerified;

    @Column(name = "avatar_url", length = 500)
    private String avatarUrl;

    public String getUserId() {
        return userId;
    }

    public void setUserId(String userId) {
        this.userId = userId;
    }

    public Role getRole() {
        return role;
    }

    public void setRole(Role role) {
        this.role = role;
        if (role != null && AccountRoleProfile.supports(role.getRoleName())
                && roleProfiles.stream().noneMatch(p -> p.getRoleName().equals(role.getRoleName()))) {
            roleProfiles.add(new AccountRoleProfile(this, role.getRoleName()));
        }
    }

    public String getFullName() {
        return fullName;
    }

    public void setFullName(String fullName) {
        this.fullName = fullName;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }

    public String getPhone() {
        return phone;
    }

    public void setPhone(String phone) {
        this.phone = phone;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public boolean isEmailVerified() {
        return emailVerified;
    }

    public void setEmailVerified(boolean emailVerified) {
        this.emailVerified = emailVerified;
    }

    public String getAvatarUrl() {
        return avatarUrl;
    }

    public void setAvatarUrl(String avatarUrl) {
        this.avatarUrl = avatarUrl;
    }
    @Override public String getId() { return userId; }
}
