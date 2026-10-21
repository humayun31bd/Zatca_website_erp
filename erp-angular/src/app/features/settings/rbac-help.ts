export type RbacHelpTab =
  | 'users'
  | 'delegates'
  | 'login'
  | 'password'
  | 'roles'
  | 'pages'
  | 'hibernate';

export interface RbacHelpSection {
  heading: string;
  body: string;
}

export interface RbacHelpTopic {
  title: string;
  summary: string;
  sections: RbacHelpSection[];
}

export const RBAC_HELP: Record<RbacHelpTab, RbacHelpTopic> = {
  users: {
    title: 'Users',
    summary: 'Create and maintain tenant login accounts that can sign in to this ERP.',
    sections: [
      {
        heading: 'What this tab is for',
        body: 'Users are the people who receive an email and password for this tenant. Each row is a real account stored in /api/v1/users. Search by email, filter by role, then add, edit, or delete.'
      },
      {
        heading: 'How to add a user',
        body: 'Click Add User. Enter a unique email, a password (required for new accounts), and a system role. SUPERADMIN is platform-wide, TENANT_ADMIN manages this company, and TENANT_USER is a standard operator. Save to create the login immediately.'
      },
      {
        heading: 'How to edit or remove',
        body: 'Use the pencil to change email, role, or password. Leave password blank to keep the current one. Use the trash icon to delete. You cannot recover a deleted account from this screen.'
      },
      {
        heading: 'Roles on this tab',
        body: 'This list only accepts API roles: SUPERADMIN, TENANT_ADMIN, TENANT_USER. Enterprise profiles such as MAKER or CHECKER are assigned on User Roles, not here.'
      }
    ]
  },
  delegates: {
    title: 'Delegate Users',
    summary: 'Temporarily hand your authority to another user while you are away.',
    sections: [
      {
        heading: 'What this tab is for',
        body: 'A delegation lets one user (from) grant selected module access to another user (to) for a date range. Use this for leave cover, dual control, or emergency approvals.'
      },
      {
        heading: 'How to create a delegation',
        body: 'Click Add Delegation. Choose the delegator, the delegatee, a module scope (or All modules), and start/end dates. Status becomes Scheduled if the start is in the future, Active during the window, and Expired after the end date.'
      },
      {
        heading: 'Revoke',
        body: 'Revoke stops the handoff immediately. Revoked rows stay in the list for audit. Delegations are stored locally until a server API exists, so they apply in this browser preview only.'
      }
    ]
  },
  login: {
    title: 'Login Users',
    summary: 'Control who may sign in, lock accounts, and require MFA.',
    sections: [
      {
        heading: 'What this tab is for',
        body: 'Login Users is the gate in front of the password. An account can exist under Users but still be blocked here.'
      },
      {
        heading: 'Can login',
        body: 'Off means the person cannot authenticate, even with a valid password. Turning Can login off also locks the account.'
      },
      {
        heading: 'Locked',
        body: 'Use Locked after failed attempts or when an employee leaves. A locked user cannot log in until you unlock them.'
      },
      {
        heading: 'MFA',
        body: 'Enable MFA to require a second factor at sign-in. These flags are preview-only until login fields exist on the users API.'
      }
    ]
  },
  password: {
    title: 'Change Password',
    summary: 'Reset a selected user’s password without opening the user editor.',
    sections: [
      {
        heading: 'What this tab is for',
        body: 'Administrators reset passwords here when a user is locked out or a credential must rotate. The change is written to /api/v1/users/:id.'
      },
      {
        heading: 'Steps',
        body: 'Select the user, type a new password of at least 8 characters, confirm it, then click Update Password. Use the eye icons to show or hide the fields.'
      },
      {
        heading: 'Rules',
        body: 'New password and confirmation must match. After a successful update, tell the user out of band. This screen does not email the new password.'
      }
    ]
  },
  roles: {
    title: 'User Roles',
    summary: 'Configure C/R/U/A/P module rights per enterprise role, then assign those roles to people.',
    sections: [
      {
        heading: 'Enterprise roles',
        body: 'Sys Admin, MAKER, CHECKER, APPROVER, Budget Off., Int. Auditor, Ext. Auditor, and Mgmt (DG) match the Flutter RBAC matrix. Sys Admin and Mgmt (DG) default to full access when no matrix row exists.'
      },
      {
        heading: 'Permission letters',
        body: 'C = Create draft. R = Read or view. U = Update draft. A = Checker approve. P = Post or period lock. Toggle cells for the selected role, or apply Maker, Checker, Approver, or Auditor presets.'
      },
      {
        heading: 'Assignments',
        body: 'The lower table maps each email to a security profile. SUPERADMIN, TENANT_ADMIN, and TENANT_USER also update /api/v1/users. MAKER, CHECKER, APPROVER, BUDGET_OFFICER, and INTERNAL_AUDITOR are stored locally until a roles API exists.'
      },
      {
        heading: 'Save Permission Policy',
        body: 'The toolbar Save button writes the matrix and page grants to this browser so the policy survives reload in preview.'
      }
    ]
  },
  pages: {
    title: 'Page Permissions',
    summary: 'Grant View, Create, and Edit on individual menu pages.',
    sections: [
      {
        heading: 'What this tab is for',
        body: 'Page Permissions is finer than the module matrix. Hide or expose a single route such as POS, vouchers, or employee directory without turning off the whole module.'
      },
      {
        heading: 'View / Create / Edit',
        body: 'View is required to open the page. Create and Edit are disabled until View is on. Turning View off also clears Create and Edit.'
      },
      {
        heading: 'Storage',
        body: 'Changes are stored locally until a permissions API exists. Save Permission Policy in the header persists the current grid.'
      }
    ]
  },
  hibernate: {
    title: 'Module Hibernation',
    summary: 'Hide an entire sidebar module without deleting its data.',
    sections: [
      {
        heading: 'What this tab is for',
        body: 'Hibernation is for tenants that do not use a module yet (for example HR or WhatsApp). Data stays in the database; only the menu group is intended to disappear.'
      },
      {
        heading: 'How to hibernate',
        body: 'Toggle the switch on a module card. The card highlights when hibernated. Toggle again to reactivate. The counter in the toolbar shows how many modules are asleep.'
      },
      {
        heading: 'Note',
        body: 'This is a preview control stored in the browser. Sidebar hiding is applied when a hibernation API is connected; until then the switches record policy only.'
      }
    ]
  }
};
