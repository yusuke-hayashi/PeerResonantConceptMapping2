# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Peer Resonant Concept Mapping - 教育支援プラットフォーム。学生が概念マップを作成し、教師の見本や他の学生のマップと比較できるシステム。LLMを活用した語彙調整により、異なる表現でも意味的に類似した概念を比較可能にする。

## Tech Stack

- **Frontend**: React + TypeScript (Vite)
- **Backend**: Cloudflare Workers (serverless)
- **Database**: Firebase Firestore (peer-resonant-concept-map2)
- **Auth**: Firebase Authentication
- **LLM**: LM Studio (http://127.0.0.1:1234) - openai/gpt-oss-20b
- **Deploy**: Cloudflare Pages (frontend) + Cloudflare Workers (API)
- **Testing**: Vitest + fast-check (property-based testing)

## Architecture

3層アーキテクチャ:
1. **Presentation**: React SPA
2. **Application**: Cloudflare Workers (AuthService, ConceptMapService, ComparisonService, PermissionService, LLMAdapter)
3. **Data**: Firebase Firestore

## Key Data Models

- **User**: id, email, role (teacher/student), displayName
- **Topic**: id, name, description, createdBy
- **ConceptMap**: id, topicId, ownerId, isReference, nodes[], links[]
- **Node**: id, label, type (noun/verb), position, style
- **Link**: id, sourceNodeId, targetNodeId, relationship
- **Comparison**: id, type, topicId, mapIds[], result
- **ComparisonPermission**: id, comparisonId, studentId, grantedBy

## Node Visual Styles

- **Noun nodes**: Rectangle (no border-radius), cool colors (blue/green/purple)
- **Verb nodes**: Rounded rectangle (12px border-radius), warm colors (red/orange/yellow)

## Comparison Modes

1. 1対1 (one_to_one): 見本1 + 学生1
2. 教師対全学生 (teacher_to_all): 見本1 + トピック内の全学生マップ
3. 学生全体 (all_students): トピック内の全学生マップ間
4. 一部学生 (partial_students): 選択した学生マップ間

## Specification Files (実装時に必ず参照)

実装は以下の仕様書に従って行うこと:

- `.kiro/specs/peer-concept-mapping/requirements.md` - 要件定義（受入基準を満たすこと）
- `.kiro/specs/peer-concept-mapping/design.md` - 設計書（インターフェース、データモデル、正しさのプロパティ）
- `.kiro/specs/peer-concept-mapping/tasks.md` - 実装タスク（チェックリスト形式、完了したらチェック）
- `docs/conceptmap/specification.md` - 概念マップのデータ構造・制約・ルールの仕様

タスク実行時は`tasks.md`の順序に従い、実装完了後は必ず`tasks.md`のチェックボックスにチェックを入れること（`[ ]` → `[x]`）。

**仕様変更時は必ず`.kiro/specs/peer-concept-mapping/`配下のファイルを更新すること。**

## Progress Tracking (必須)

- 作業開始前に`.tmp/progress.md`を確認すること
- タスク完了時に`.tmp/progress.md`に進捗を記録すること
- 記録内容: 完了したタスク、現在の状況、次のステップ、課題・注意事項

## Property-Based Testing

17個の正しさのプロパティをfast-checkで検証する。各テストにはコメントで対応するプロパティを明記:
```typescript
// Feature: peer-concept-mapping, Property {番号}: {プロパティテキスト}
```

## Permission Rules

- 学生は自分のマップのみ閲覧・編集可能
- 比較結果はデフォルト非公開、教師が明示的に権限付与
- 同じトピック内の概念マップのみ比較可能

## Link Label Display Rules

マップを表示する際は、リンクのラベル（何が/何を/何に/どこで/いつ）を必ず表示すること。

- エディタ画面（ConceptMapEditor）: `link.label`と`link.relationship`を組み合わせて表示
- 比較画面（ComparisonMapView）: 同様に`link.label`を表示
- 表示形式: `{label}: {relationship}`（例: 「何を: 光合成」）
- `relationship`がない場合は`label`のみ表示
