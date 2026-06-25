// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'local_database.dart';

// ignore_for_file: type=lint
class $LocalAnswersTable extends LocalAnswers
    with TableInfo<$LocalAnswersTable, LocalAnswer> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $LocalAnswersTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _idMeta = const VerificationMeta('id');
  @override
  late final GeneratedColumn<String> id = GeneratedColumn<String>(
      'id', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _sessionIdMeta =
      const VerificationMeta('sessionId');
  @override
  late final GeneratedColumn<String> sessionId = GeneratedColumn<String>(
      'session_id', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _questionIdMeta =
      const VerificationMeta('questionId');
  @override
  late final GeneratedColumn<String> questionId = GeneratedColumn<String>(
      'question_id', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _answerTextMeta =
      const VerificationMeta('answerText');
  @override
  late final GeneratedColumn<String> answerText = GeneratedColumn<String>(
      'answer_text', aliasedName, true,
      type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _answeredAtMeta =
      const VerificationMeta('answeredAt');
  @override
  late final GeneratedColumn<DateTime> answeredAt = GeneratedColumn<DateTime>(
      'answered_at', aliasedName, false,
      type: DriftSqlType.dateTime, requiredDuringInsert: true);
  static const VerificationMeta _syncedMeta = const VerificationMeta('synced');
  @override
  late final GeneratedColumn<bool> synced = GeneratedColumn<bool>(
      'synced', aliasedName, false,
      type: DriftSqlType.bool,
      requiredDuringInsert: false,
      defaultConstraints:
          GeneratedColumn.constraintIsAlways('CHECK ("synced" IN (0, 1))'),
      defaultValue: const Constant(false));
  static const VerificationMeta _createdAtMeta =
      const VerificationMeta('createdAt');
  @override
  late final GeneratedColumn<DateTime> createdAt = GeneratedColumn<DateTime>(
      'created_at', aliasedName, false,
      type: DriftSqlType.dateTime,
      requiredDuringInsert: false,
      defaultValue: currentDateAndTime);
  @override
  List<GeneratedColumn> get $columns =>
      [id, sessionId, questionId, answerText, answeredAt, synced, createdAt];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'local_answers';
  @override
  VerificationContext validateIntegrity(Insertable<LocalAnswer> instance,
      {bool isInserting = false}) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('id')) {
      context.handle(_idMeta, id.isAcceptableOrUnknown(data['id']!, _idMeta));
    } else if (isInserting) {
      context.missing(_idMeta);
    }
    if (data.containsKey('session_id')) {
      context.handle(_sessionIdMeta,
          sessionId.isAcceptableOrUnknown(data['session_id']!, _sessionIdMeta));
    } else if (isInserting) {
      context.missing(_sessionIdMeta);
    }
    if (data.containsKey('question_id')) {
      context.handle(
          _questionIdMeta,
          questionId.isAcceptableOrUnknown(
              data['question_id']!, _questionIdMeta));
    } else if (isInserting) {
      context.missing(_questionIdMeta);
    }
    if (data.containsKey('answer_text')) {
      context.handle(
          _answerTextMeta,
          answerText.isAcceptableOrUnknown(
              data['answer_text']!, _answerTextMeta));
    }
    if (data.containsKey('answered_at')) {
      context.handle(
          _answeredAtMeta,
          answeredAt.isAcceptableOrUnknown(
              data['answered_at']!, _answeredAtMeta));
    } else if (isInserting) {
      context.missing(_answeredAtMeta);
    }
    if (data.containsKey('synced')) {
      context.handle(_syncedMeta,
          synced.isAcceptableOrUnknown(data['synced']!, _syncedMeta));
    }
    if (data.containsKey('created_at')) {
      context.handle(_createdAtMeta,
          createdAt.isAcceptableOrUnknown(data['created_at']!, _createdAtMeta));
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {id};
  @override
  LocalAnswer map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return LocalAnswer(
      id: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}id'])!,
      sessionId: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}session_id'])!,
      questionId: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}question_id'])!,
      answerText: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}answer_text']),
      answeredAt: attachedDatabase.typeMapping
          .read(DriftSqlType.dateTime, data['${effectivePrefix}answered_at'])!,
      synced: attachedDatabase.typeMapping
          .read(DriftSqlType.bool, data['${effectivePrefix}synced'])!,
      createdAt: attachedDatabase.typeMapping
          .read(DriftSqlType.dateTime, data['${effectivePrefix}created_at'])!,
    );
  }

  @override
  $LocalAnswersTable createAlias(String alias) {
    return $LocalAnswersTable(attachedDatabase, alias);
  }
}

class LocalAnswer extends DataClass implements Insertable<LocalAnswer> {
  final String id;
  final String sessionId;
  final String questionId;
  final String? answerText;
  final DateTime answeredAt;
  final bool synced;
  final DateTime createdAt;
  const LocalAnswer(
      {required this.id,
      required this.sessionId,
      required this.questionId,
      this.answerText,
      required this.answeredAt,
      required this.synced,
      required this.createdAt});
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['id'] = Variable<String>(id);
    map['session_id'] = Variable<String>(sessionId);
    map['question_id'] = Variable<String>(questionId);
    if (!nullToAbsent || answerText != null) {
      map['answer_text'] = Variable<String>(answerText);
    }
    map['answered_at'] = Variable<DateTime>(answeredAt);
    map['synced'] = Variable<bool>(synced);
    map['created_at'] = Variable<DateTime>(createdAt);
    return map;
  }

  LocalAnswersCompanion toCompanion(bool nullToAbsent) {
    return LocalAnswersCompanion(
      id: Value(id),
      sessionId: Value(sessionId),
      questionId: Value(questionId),
      answerText: answerText == null && nullToAbsent
          ? const Value.absent()
          : Value(answerText),
      answeredAt: Value(answeredAt),
      synced: Value(synced),
      createdAt: Value(createdAt),
    );
  }

  factory LocalAnswer.fromJson(Map<String, dynamic> json,
      {ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return LocalAnswer(
      id: serializer.fromJson<String>(json['id']),
      sessionId: serializer.fromJson<String>(json['sessionId']),
      questionId: serializer.fromJson<String>(json['questionId']),
      answerText: serializer.fromJson<String?>(json['answerText']),
      answeredAt: serializer.fromJson<DateTime>(json['answeredAt']),
      synced: serializer.fromJson<bool>(json['synced']),
      createdAt: serializer.fromJson<DateTime>(json['createdAt']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'id': serializer.toJson<String>(id),
      'sessionId': serializer.toJson<String>(sessionId),
      'questionId': serializer.toJson<String>(questionId),
      'answerText': serializer.toJson<String?>(answerText),
      'answeredAt': serializer.toJson<DateTime>(answeredAt),
      'synced': serializer.toJson<bool>(synced),
      'createdAt': serializer.toJson<DateTime>(createdAt),
    };
  }

  LocalAnswer copyWith(
          {String? id,
          String? sessionId,
          String? questionId,
          Value<String?> answerText = const Value.absent(),
          DateTime? answeredAt,
          bool? synced,
          DateTime? createdAt}) =>
      LocalAnswer(
        id: id ?? this.id,
        sessionId: sessionId ?? this.sessionId,
        questionId: questionId ?? this.questionId,
        answerText: answerText.present ? answerText.value : this.answerText,
        answeredAt: answeredAt ?? this.answeredAt,
        synced: synced ?? this.synced,
        createdAt: createdAt ?? this.createdAt,
      );
  LocalAnswer copyWithCompanion(LocalAnswersCompanion data) {
    return LocalAnswer(
      id: data.id.present ? data.id.value : this.id,
      sessionId: data.sessionId.present ? data.sessionId.value : this.sessionId,
      questionId:
          data.questionId.present ? data.questionId.value : this.questionId,
      answerText:
          data.answerText.present ? data.answerText.value : this.answerText,
      answeredAt:
          data.answeredAt.present ? data.answeredAt.value : this.answeredAt,
      synced: data.synced.present ? data.synced.value : this.synced,
      createdAt: data.createdAt.present ? data.createdAt.value : this.createdAt,
    );
  }

  @override
  String toString() {
    return (StringBuffer('LocalAnswer(')
          ..write('id: $id, ')
          ..write('sessionId: $sessionId, ')
          ..write('questionId: $questionId, ')
          ..write('answerText: $answerText, ')
          ..write('answeredAt: $answeredAt, ')
          ..write('synced: $synced, ')
          ..write('createdAt: $createdAt')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hash(
      id, sessionId, questionId, answerText, answeredAt, synced, createdAt);
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is LocalAnswer &&
          other.id == this.id &&
          other.sessionId == this.sessionId &&
          other.questionId == this.questionId &&
          other.answerText == this.answerText &&
          other.answeredAt == this.answeredAt &&
          other.synced == this.synced &&
          other.createdAt == this.createdAt);
}

class LocalAnswersCompanion extends UpdateCompanion<LocalAnswer> {
  final Value<String> id;
  final Value<String> sessionId;
  final Value<String> questionId;
  final Value<String?> answerText;
  final Value<DateTime> answeredAt;
  final Value<bool> synced;
  final Value<DateTime> createdAt;
  final Value<int> rowid;
  const LocalAnswersCompanion({
    this.id = const Value.absent(),
    this.sessionId = const Value.absent(),
    this.questionId = const Value.absent(),
    this.answerText = const Value.absent(),
    this.answeredAt = const Value.absent(),
    this.synced = const Value.absent(),
    this.createdAt = const Value.absent(),
    this.rowid = const Value.absent(),
  });
  LocalAnswersCompanion.insert({
    required String id,
    required String sessionId,
    required String questionId,
    this.answerText = const Value.absent(),
    required DateTime answeredAt,
    this.synced = const Value.absent(),
    this.createdAt = const Value.absent(),
    this.rowid = const Value.absent(),
  })  : id = Value(id),
        sessionId = Value(sessionId),
        questionId = Value(questionId),
        answeredAt = Value(answeredAt);
  static Insertable<LocalAnswer> custom({
    Expression<String>? id,
    Expression<String>? sessionId,
    Expression<String>? questionId,
    Expression<String>? answerText,
    Expression<DateTime>? answeredAt,
    Expression<bool>? synced,
    Expression<DateTime>? createdAt,
    Expression<int>? rowid,
  }) {
    return RawValuesInsertable({
      if (id != null) 'id': id,
      if (sessionId != null) 'session_id': sessionId,
      if (questionId != null) 'question_id': questionId,
      if (answerText != null) 'answer_text': answerText,
      if (answeredAt != null) 'answered_at': answeredAt,
      if (synced != null) 'synced': synced,
      if (createdAt != null) 'created_at': createdAt,
      if (rowid != null) 'rowid': rowid,
    });
  }

  LocalAnswersCompanion copyWith(
      {Value<String>? id,
      Value<String>? sessionId,
      Value<String>? questionId,
      Value<String?>? answerText,
      Value<DateTime>? answeredAt,
      Value<bool>? synced,
      Value<DateTime>? createdAt,
      Value<int>? rowid}) {
    return LocalAnswersCompanion(
      id: id ?? this.id,
      sessionId: sessionId ?? this.sessionId,
      questionId: questionId ?? this.questionId,
      answerText: answerText ?? this.answerText,
      answeredAt: answeredAt ?? this.answeredAt,
      synced: synced ?? this.synced,
      createdAt: createdAt ?? this.createdAt,
      rowid: rowid ?? this.rowid,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (id.present) {
      map['id'] = Variable<String>(id.value);
    }
    if (sessionId.present) {
      map['session_id'] = Variable<String>(sessionId.value);
    }
    if (questionId.present) {
      map['question_id'] = Variable<String>(questionId.value);
    }
    if (answerText.present) {
      map['answer_text'] = Variable<String>(answerText.value);
    }
    if (answeredAt.present) {
      map['answered_at'] = Variable<DateTime>(answeredAt.value);
    }
    if (synced.present) {
      map['synced'] = Variable<bool>(synced.value);
    }
    if (createdAt.present) {
      map['created_at'] = Variable<DateTime>(createdAt.value);
    }
    if (rowid.present) {
      map['rowid'] = Variable<int>(rowid.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('LocalAnswersCompanion(')
          ..write('id: $id, ')
          ..write('sessionId: $sessionId, ')
          ..write('questionId: $questionId, ')
          ..write('answerText: $answerText, ')
          ..write('answeredAt: $answeredAt, ')
          ..write('synced: $synced, ')
          ..write('createdAt: $createdAt, ')
          ..write('rowid: $rowid')
          ..write(')'))
        .toString();
  }
}

class $LocalExamsTable extends LocalExams
    with TableInfo<$LocalExamsTable, LocalExam> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $LocalExamsTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _idMeta = const VerificationMeta('id');
  @override
  late final GeneratedColumn<String> id = GeneratedColumn<String>(
      'id', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _titleMeta = const VerificationMeta('title');
  @override
  late final GeneratedColumn<String> title = GeneratedColumn<String>(
      'title', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _durationMinutesMeta =
      const VerificationMeta('durationMinutes');
  @override
  late final GeneratedColumn<int> durationMinutes = GeneratedColumn<int>(
      'duration_minutes', aliasedName, false,
      type: DriftSqlType.int, requiredDuringInsert: true);
  static const VerificationMeta _questionsJsonMeta =
      const VerificationMeta('questionsJson');
  @override
  late final GeneratedColumn<String> questionsJson = GeneratedColumn<String>(
      'questions_json', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _fetchedAtMeta =
      const VerificationMeta('fetchedAt');
  @override
  late final GeneratedColumn<DateTime> fetchedAt = GeneratedColumn<DateTime>(
      'fetched_at', aliasedName, false,
      type: DriftSqlType.dateTime,
      requiredDuringInsert: false,
      defaultValue: currentDateAndTime);
  @override
  List<GeneratedColumn> get $columns =>
      [id, title, durationMinutes, questionsJson, fetchedAt];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'local_exams';
  @override
  VerificationContext validateIntegrity(Insertable<LocalExam> instance,
      {bool isInserting = false}) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('id')) {
      context.handle(_idMeta, id.isAcceptableOrUnknown(data['id']!, _idMeta));
    } else if (isInserting) {
      context.missing(_idMeta);
    }
    if (data.containsKey('title')) {
      context.handle(
          _titleMeta, title.isAcceptableOrUnknown(data['title']!, _titleMeta));
    } else if (isInserting) {
      context.missing(_titleMeta);
    }
    if (data.containsKey('duration_minutes')) {
      context.handle(
          _durationMinutesMeta,
          durationMinutes.isAcceptableOrUnknown(
              data['duration_minutes']!, _durationMinutesMeta));
    } else if (isInserting) {
      context.missing(_durationMinutesMeta);
    }
    if (data.containsKey('questions_json')) {
      context.handle(
          _questionsJsonMeta,
          questionsJson.isAcceptableOrUnknown(
              data['questions_json']!, _questionsJsonMeta));
    } else if (isInserting) {
      context.missing(_questionsJsonMeta);
    }
    if (data.containsKey('fetched_at')) {
      context.handle(_fetchedAtMeta,
          fetchedAt.isAcceptableOrUnknown(data['fetched_at']!, _fetchedAtMeta));
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {id};
  @override
  LocalExam map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return LocalExam(
      id: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}id'])!,
      title: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}title'])!,
      durationMinutes: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}duration_minutes'])!,
      questionsJson: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}questions_json'])!,
      fetchedAt: attachedDatabase.typeMapping
          .read(DriftSqlType.dateTime, data['${effectivePrefix}fetched_at'])!,
    );
  }

  @override
  $LocalExamsTable createAlias(String alias) {
    return $LocalExamsTable(attachedDatabase, alias);
  }
}

class LocalExam extends DataClass implements Insertable<LocalExam> {
  final String id;
  final String title;
  final int durationMinutes;
  final String questionsJson;
  final DateTime fetchedAt;
  const LocalExam(
      {required this.id,
      required this.title,
      required this.durationMinutes,
      required this.questionsJson,
      required this.fetchedAt});
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['id'] = Variable<String>(id);
    map['title'] = Variable<String>(title);
    map['duration_minutes'] = Variable<int>(durationMinutes);
    map['questions_json'] = Variable<String>(questionsJson);
    map['fetched_at'] = Variable<DateTime>(fetchedAt);
    return map;
  }

  LocalExamsCompanion toCompanion(bool nullToAbsent) {
    return LocalExamsCompanion(
      id: Value(id),
      title: Value(title),
      durationMinutes: Value(durationMinutes),
      questionsJson: Value(questionsJson),
      fetchedAt: Value(fetchedAt),
    );
  }

  factory LocalExam.fromJson(Map<String, dynamic> json,
      {ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return LocalExam(
      id: serializer.fromJson<String>(json['id']),
      title: serializer.fromJson<String>(json['title']),
      durationMinutes: serializer.fromJson<int>(json['durationMinutes']),
      questionsJson: serializer.fromJson<String>(json['questionsJson']),
      fetchedAt: serializer.fromJson<DateTime>(json['fetchedAt']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'id': serializer.toJson<String>(id),
      'title': serializer.toJson<String>(title),
      'durationMinutes': serializer.toJson<int>(durationMinutes),
      'questionsJson': serializer.toJson<String>(questionsJson),
      'fetchedAt': serializer.toJson<DateTime>(fetchedAt),
    };
  }

  LocalExam copyWith(
          {String? id,
          String? title,
          int? durationMinutes,
          String? questionsJson,
          DateTime? fetchedAt}) =>
      LocalExam(
        id: id ?? this.id,
        title: title ?? this.title,
        durationMinutes: durationMinutes ?? this.durationMinutes,
        questionsJson: questionsJson ?? this.questionsJson,
        fetchedAt: fetchedAt ?? this.fetchedAt,
      );
  LocalExam copyWithCompanion(LocalExamsCompanion data) {
    return LocalExam(
      id: data.id.present ? data.id.value : this.id,
      title: data.title.present ? data.title.value : this.title,
      durationMinutes: data.durationMinutes.present
          ? data.durationMinutes.value
          : this.durationMinutes,
      questionsJson: data.questionsJson.present
          ? data.questionsJson.value
          : this.questionsJson,
      fetchedAt: data.fetchedAt.present ? data.fetchedAt.value : this.fetchedAt,
    );
  }

  @override
  String toString() {
    return (StringBuffer('LocalExam(')
          ..write('id: $id, ')
          ..write('title: $title, ')
          ..write('durationMinutes: $durationMinutes, ')
          ..write('questionsJson: $questionsJson, ')
          ..write('fetchedAt: $fetchedAt')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode =>
      Object.hash(id, title, durationMinutes, questionsJson, fetchedAt);
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is LocalExam &&
          other.id == this.id &&
          other.title == this.title &&
          other.durationMinutes == this.durationMinutes &&
          other.questionsJson == this.questionsJson &&
          other.fetchedAt == this.fetchedAt);
}

class LocalExamsCompanion extends UpdateCompanion<LocalExam> {
  final Value<String> id;
  final Value<String> title;
  final Value<int> durationMinutes;
  final Value<String> questionsJson;
  final Value<DateTime> fetchedAt;
  final Value<int> rowid;
  const LocalExamsCompanion({
    this.id = const Value.absent(),
    this.title = const Value.absent(),
    this.durationMinutes = const Value.absent(),
    this.questionsJson = const Value.absent(),
    this.fetchedAt = const Value.absent(),
    this.rowid = const Value.absent(),
  });
  LocalExamsCompanion.insert({
    required String id,
    required String title,
    required int durationMinutes,
    required String questionsJson,
    this.fetchedAt = const Value.absent(),
    this.rowid = const Value.absent(),
  })  : id = Value(id),
        title = Value(title),
        durationMinutes = Value(durationMinutes),
        questionsJson = Value(questionsJson);
  static Insertable<LocalExam> custom({
    Expression<String>? id,
    Expression<String>? title,
    Expression<int>? durationMinutes,
    Expression<String>? questionsJson,
    Expression<DateTime>? fetchedAt,
    Expression<int>? rowid,
  }) {
    return RawValuesInsertable({
      if (id != null) 'id': id,
      if (title != null) 'title': title,
      if (durationMinutes != null) 'duration_minutes': durationMinutes,
      if (questionsJson != null) 'questions_json': questionsJson,
      if (fetchedAt != null) 'fetched_at': fetchedAt,
      if (rowid != null) 'rowid': rowid,
    });
  }

  LocalExamsCompanion copyWith(
      {Value<String>? id,
      Value<String>? title,
      Value<int>? durationMinutes,
      Value<String>? questionsJson,
      Value<DateTime>? fetchedAt,
      Value<int>? rowid}) {
    return LocalExamsCompanion(
      id: id ?? this.id,
      title: title ?? this.title,
      durationMinutes: durationMinutes ?? this.durationMinutes,
      questionsJson: questionsJson ?? this.questionsJson,
      fetchedAt: fetchedAt ?? this.fetchedAt,
      rowid: rowid ?? this.rowid,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (id.present) {
      map['id'] = Variable<String>(id.value);
    }
    if (title.present) {
      map['title'] = Variable<String>(title.value);
    }
    if (durationMinutes.present) {
      map['duration_minutes'] = Variable<int>(durationMinutes.value);
    }
    if (questionsJson.present) {
      map['questions_json'] = Variable<String>(questionsJson.value);
    }
    if (fetchedAt.present) {
      map['fetched_at'] = Variable<DateTime>(fetchedAt.value);
    }
    if (rowid.present) {
      map['rowid'] = Variable<int>(rowid.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('LocalExamsCompanion(')
          ..write('id: $id, ')
          ..write('title: $title, ')
          ..write('durationMinutes: $durationMinutes, ')
          ..write('questionsJson: $questionsJson, ')
          ..write('fetchedAt: $fetchedAt, ')
          ..write('rowid: $rowid')
          ..write(')'))
        .toString();
  }
}

abstract class _$LocalDatabase extends GeneratedDatabase {
  _$LocalDatabase(QueryExecutor e) : super(e);
  $LocalDatabaseManager get managers => $LocalDatabaseManager(this);
  late final $LocalAnswersTable localAnswers = $LocalAnswersTable(this);
  late final $LocalExamsTable localExams = $LocalExamsTable(this);
  @override
  Iterable<TableInfo<Table, Object?>> get allTables =>
      allSchemaEntities.whereType<TableInfo<Table, Object?>>();
  @override
  List<DatabaseSchemaEntity> get allSchemaEntities =>
      [localAnswers, localExams];
}

typedef $$LocalAnswersTableCreateCompanionBuilder = LocalAnswersCompanion
    Function({
  required String id,
  required String sessionId,
  required String questionId,
  Value<String?> answerText,
  required DateTime answeredAt,
  Value<bool> synced,
  Value<DateTime> createdAt,
  Value<int> rowid,
});
typedef $$LocalAnswersTableUpdateCompanionBuilder = LocalAnswersCompanion
    Function({
  Value<String> id,
  Value<String> sessionId,
  Value<String> questionId,
  Value<String?> answerText,
  Value<DateTime> answeredAt,
  Value<bool> synced,
  Value<DateTime> createdAt,
  Value<int> rowid,
});

class $$LocalAnswersTableFilterComposer
    extends Composer<_$LocalDatabase, $LocalAnswersTable> {
  $$LocalAnswersTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<String> get id => $composableBuilder(
      column: $table.id, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get sessionId => $composableBuilder(
      column: $table.sessionId, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get questionId => $composableBuilder(
      column: $table.questionId, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get answerText => $composableBuilder(
      column: $table.answerText, builder: (column) => ColumnFilters(column));

  ColumnFilters<DateTime> get answeredAt => $composableBuilder(
      column: $table.answeredAt, builder: (column) => ColumnFilters(column));

  ColumnFilters<bool> get synced => $composableBuilder(
      column: $table.synced, builder: (column) => ColumnFilters(column));

  ColumnFilters<DateTime> get createdAt => $composableBuilder(
      column: $table.createdAt, builder: (column) => ColumnFilters(column));
}

class $$LocalAnswersTableOrderingComposer
    extends Composer<_$LocalDatabase, $LocalAnswersTable> {
  $$LocalAnswersTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<String> get id => $composableBuilder(
      column: $table.id, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get sessionId => $composableBuilder(
      column: $table.sessionId, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get questionId => $composableBuilder(
      column: $table.questionId, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get answerText => $composableBuilder(
      column: $table.answerText, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<DateTime> get answeredAt => $composableBuilder(
      column: $table.answeredAt, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<bool> get synced => $composableBuilder(
      column: $table.synced, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<DateTime> get createdAt => $composableBuilder(
      column: $table.createdAt, builder: (column) => ColumnOrderings(column));
}

class $$LocalAnswersTableAnnotationComposer
    extends Composer<_$LocalDatabase, $LocalAnswersTable> {
  $$LocalAnswersTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<String> get id =>
      $composableBuilder(column: $table.id, builder: (column) => column);

  GeneratedColumn<String> get sessionId =>
      $composableBuilder(column: $table.sessionId, builder: (column) => column);

  GeneratedColumn<String> get questionId => $composableBuilder(
      column: $table.questionId, builder: (column) => column);

  GeneratedColumn<String> get answerText => $composableBuilder(
      column: $table.answerText, builder: (column) => column);

  GeneratedColumn<DateTime> get answeredAt => $composableBuilder(
      column: $table.answeredAt, builder: (column) => column);

  GeneratedColumn<bool> get synced =>
      $composableBuilder(column: $table.synced, builder: (column) => column);

  GeneratedColumn<DateTime> get createdAt =>
      $composableBuilder(column: $table.createdAt, builder: (column) => column);
}

class $$LocalAnswersTableTableManager extends RootTableManager<
    _$LocalDatabase,
    $LocalAnswersTable,
    LocalAnswer,
    $$LocalAnswersTableFilterComposer,
    $$LocalAnswersTableOrderingComposer,
    $$LocalAnswersTableAnnotationComposer,
    $$LocalAnswersTableCreateCompanionBuilder,
    $$LocalAnswersTableUpdateCompanionBuilder,
    (
      LocalAnswer,
      BaseReferences<_$LocalDatabase, $LocalAnswersTable, LocalAnswer>
    ),
    LocalAnswer,
    PrefetchHooks Function()> {
  $$LocalAnswersTableTableManager(_$LocalDatabase db, $LocalAnswersTable table)
      : super(TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$LocalAnswersTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$LocalAnswersTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$LocalAnswersTableAnnotationComposer($db: db, $table: table),
          updateCompanionCallback: ({
            Value<String> id = const Value.absent(),
            Value<String> sessionId = const Value.absent(),
            Value<String> questionId = const Value.absent(),
            Value<String?> answerText = const Value.absent(),
            Value<DateTime> answeredAt = const Value.absent(),
            Value<bool> synced = const Value.absent(),
            Value<DateTime> createdAt = const Value.absent(),
            Value<int> rowid = const Value.absent(),
          }) =>
              LocalAnswersCompanion(
            id: id,
            sessionId: sessionId,
            questionId: questionId,
            answerText: answerText,
            answeredAt: answeredAt,
            synced: synced,
            createdAt: createdAt,
            rowid: rowid,
          ),
          createCompanionCallback: ({
            required String id,
            required String sessionId,
            required String questionId,
            Value<String?> answerText = const Value.absent(),
            required DateTime answeredAt,
            Value<bool> synced = const Value.absent(),
            Value<DateTime> createdAt = const Value.absent(),
            Value<int> rowid = const Value.absent(),
          }) =>
              LocalAnswersCompanion.insert(
            id: id,
            sessionId: sessionId,
            questionId: questionId,
            answerText: answerText,
            answeredAt: answeredAt,
            synced: synced,
            createdAt: createdAt,
            rowid: rowid,
          ),
          withReferenceMapper: (p0) => p0
              .map((e) => (e.readTable(table), BaseReferences(db, table, e)))
              .toList(),
          prefetchHooksCallback: null,
        ));
}

typedef $$LocalAnswersTableProcessedTableManager = ProcessedTableManager<
    _$LocalDatabase,
    $LocalAnswersTable,
    LocalAnswer,
    $$LocalAnswersTableFilterComposer,
    $$LocalAnswersTableOrderingComposer,
    $$LocalAnswersTableAnnotationComposer,
    $$LocalAnswersTableCreateCompanionBuilder,
    $$LocalAnswersTableUpdateCompanionBuilder,
    (
      LocalAnswer,
      BaseReferences<_$LocalDatabase, $LocalAnswersTable, LocalAnswer>
    ),
    LocalAnswer,
    PrefetchHooks Function()>;
typedef $$LocalExamsTableCreateCompanionBuilder = LocalExamsCompanion Function({
  required String id,
  required String title,
  required int durationMinutes,
  required String questionsJson,
  Value<DateTime> fetchedAt,
  Value<int> rowid,
});
typedef $$LocalExamsTableUpdateCompanionBuilder = LocalExamsCompanion Function({
  Value<String> id,
  Value<String> title,
  Value<int> durationMinutes,
  Value<String> questionsJson,
  Value<DateTime> fetchedAt,
  Value<int> rowid,
});

class $$LocalExamsTableFilterComposer
    extends Composer<_$LocalDatabase, $LocalExamsTable> {
  $$LocalExamsTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<String> get id => $composableBuilder(
      column: $table.id, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get title => $composableBuilder(
      column: $table.title, builder: (column) => ColumnFilters(column));

  ColumnFilters<int> get durationMinutes => $composableBuilder(
      column: $table.durationMinutes,
      builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get questionsJson => $composableBuilder(
      column: $table.questionsJson, builder: (column) => ColumnFilters(column));

  ColumnFilters<DateTime> get fetchedAt => $composableBuilder(
      column: $table.fetchedAt, builder: (column) => ColumnFilters(column));
}

class $$LocalExamsTableOrderingComposer
    extends Composer<_$LocalDatabase, $LocalExamsTable> {
  $$LocalExamsTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<String> get id => $composableBuilder(
      column: $table.id, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get title => $composableBuilder(
      column: $table.title, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<int> get durationMinutes => $composableBuilder(
      column: $table.durationMinutes,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get questionsJson => $composableBuilder(
      column: $table.questionsJson,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<DateTime> get fetchedAt => $composableBuilder(
      column: $table.fetchedAt, builder: (column) => ColumnOrderings(column));
}

class $$LocalExamsTableAnnotationComposer
    extends Composer<_$LocalDatabase, $LocalExamsTable> {
  $$LocalExamsTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<String> get id =>
      $composableBuilder(column: $table.id, builder: (column) => column);

  GeneratedColumn<String> get title =>
      $composableBuilder(column: $table.title, builder: (column) => column);

  GeneratedColumn<int> get durationMinutes => $composableBuilder(
      column: $table.durationMinutes, builder: (column) => column);

  GeneratedColumn<String> get questionsJson => $composableBuilder(
      column: $table.questionsJson, builder: (column) => column);

  GeneratedColumn<DateTime> get fetchedAt =>
      $composableBuilder(column: $table.fetchedAt, builder: (column) => column);
}

class $$LocalExamsTableTableManager extends RootTableManager<
    _$LocalDatabase,
    $LocalExamsTable,
    LocalExam,
    $$LocalExamsTableFilterComposer,
    $$LocalExamsTableOrderingComposer,
    $$LocalExamsTableAnnotationComposer,
    $$LocalExamsTableCreateCompanionBuilder,
    $$LocalExamsTableUpdateCompanionBuilder,
    (LocalExam, BaseReferences<_$LocalDatabase, $LocalExamsTable, LocalExam>),
    LocalExam,
    PrefetchHooks Function()> {
  $$LocalExamsTableTableManager(_$LocalDatabase db, $LocalExamsTable table)
      : super(TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$LocalExamsTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$LocalExamsTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$LocalExamsTableAnnotationComposer($db: db, $table: table),
          updateCompanionCallback: ({
            Value<String> id = const Value.absent(),
            Value<String> title = const Value.absent(),
            Value<int> durationMinutes = const Value.absent(),
            Value<String> questionsJson = const Value.absent(),
            Value<DateTime> fetchedAt = const Value.absent(),
            Value<int> rowid = const Value.absent(),
          }) =>
              LocalExamsCompanion(
            id: id,
            title: title,
            durationMinutes: durationMinutes,
            questionsJson: questionsJson,
            fetchedAt: fetchedAt,
            rowid: rowid,
          ),
          createCompanionCallback: ({
            required String id,
            required String title,
            required int durationMinutes,
            required String questionsJson,
            Value<DateTime> fetchedAt = const Value.absent(),
            Value<int> rowid = const Value.absent(),
          }) =>
              LocalExamsCompanion.insert(
            id: id,
            title: title,
            durationMinutes: durationMinutes,
            questionsJson: questionsJson,
            fetchedAt: fetchedAt,
            rowid: rowid,
          ),
          withReferenceMapper: (p0) => p0
              .map((e) => (e.readTable(table), BaseReferences(db, table, e)))
              .toList(),
          prefetchHooksCallback: null,
        ));
}

typedef $$LocalExamsTableProcessedTableManager = ProcessedTableManager<
    _$LocalDatabase,
    $LocalExamsTable,
    LocalExam,
    $$LocalExamsTableFilterComposer,
    $$LocalExamsTableOrderingComposer,
    $$LocalExamsTableAnnotationComposer,
    $$LocalExamsTableCreateCompanionBuilder,
    $$LocalExamsTableUpdateCompanionBuilder,
    (LocalExam, BaseReferences<_$LocalDatabase, $LocalExamsTable, LocalExam>),
    LocalExam,
    PrefetchHooks Function()>;

class $LocalDatabaseManager {
  final _$LocalDatabase _db;
  $LocalDatabaseManager(this._db);
  $$LocalAnswersTableTableManager get localAnswers =>
      $$LocalAnswersTableTableManager(_db, _db.localAnswers);
  $$LocalExamsTableTableManager get localExams =>
      $$LocalExamsTableTableManager(_db, _db.localExams);
}
