import { HugeiconsIcon } from '@hugeicons/react-native';
import { Film01Icon, MoreHorizontalIcon } from '@hugeicons/core-free-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, spacing } from '@/theme/tokens';
import type { ProjectSummary } from '@/domain/types';
import { formatDate, formatShortTime } from '@/domain/time';

interface ProjectCardProps {
  project: ProjectSummary;
  onPress: () => void;
  onActions: () => void;
}

export function ProjectCard({ project, onPress, onActions }: ProjectCardProps) {
  const { colors } = useTheme();

  return (
    <Pressable
      accessibilityHint="Opens the editor"
      accessibilityLabel={`Open ${project.name}`}
      accessibilityRole="button"
      onLongPress={onActions}
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          opacity: pressed ? 0.82 : 1,
        },
      ]}
    >
      <View style={[styles.thumbnail, { backgroundColor: colors.secondary }]}>
        <View style={[styles.thumbnailAccent, { backgroundColor: `${colors.video}25` }]}>
          <HugeiconsIcon color={colors.video} icon={Film01Icon} size={26} />
        </View>
      </View>
      <View style={styles.body}>
        <View style={styles.titleRow}>
          <AppText numberOfLines={1} style={styles.title} variant="title">
            {project.name}
          </AppText>
          <Pressable
            accessibilityLabel={`Actions for ${project.name}`}
            accessibilityRole="button"
            hitSlop={10}
            onPress={onActions}
          >
            <HugeiconsIcon color={colors.mutedForeground} icon={MoreHorizontalIcon} size={20} />
          </Pressable>
        </View>
        <AppText muted variant="small">
          {project.width} × {project.height} · {formatShortTime(project.durationUs)}
        </AppText>
        <AppText muted variant="caption">
          {project.assetCount} {project.assetCount === 1 ? 'media item' : 'media items'} ·{' '}
          {formatDate(project.updatedAt)}
        </AppText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  thumbnail: {
    width: 78,
    height: 78,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbnailAccent: {
    width: 50,
    height: 50,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
    gap: spacing.xs,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    flex: 1,
    fontSize: 16,
    lineHeight: 21,
  },
});
