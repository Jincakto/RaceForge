package com.raceforge.backend.account.entity;

import com.raceforge.backend.common.id.BusinessIds;
import jakarta.persistence.*;
import java.util.Map;

/** Role-specific identity; account authentication always uses the independent USR code. */
@Entity
@Table(name="Account_Role_Profile", uniqueConstraints=@UniqueConstraint(columnNames={"user_id","role_name"}))
public class AccountRoleProfile {
    private static final Map<String,String> PREFIXES=Map.of(
            "HORSE_OWNER","OWN-", "VETERINARIAN","VET-", "CLUB_MANAGER","CM-");

    @Id @Column(name="profile_id",length=20,nullable=false)
    private String profileId;
    @ManyToOne(fetch=FetchType.LAZY,optional=false)
    @JoinColumn(name="user_id",nullable=false)
    private User user;
    @Column(name="role_name",length=50,nullable=false)
    private String roleName;

    protected AccountRoleProfile() { }
    public AccountRoleProfile(User user,String roleName) { this.user=user; this.roleName=roleName; }
    public static boolean supports(String roleName) { return PREFIXES.containsKey(roleName); }
    @PrePersist private void assignId() {
        if (!supports(roleName)) throw new IllegalStateException("Unsupported role profile: "+roleName);
        if (profileId==null) profileId=BusinessIds.next(PREFIXES.get(roleName));
    }
    public String getProfileId() { return profileId; }
    public String getRoleName() { return roleName; }
    public User getUser() { return user; }
}
